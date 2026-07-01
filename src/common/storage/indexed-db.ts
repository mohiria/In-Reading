import { openDB, DBSchema, IDBPDatabase } from 'idb'
import pako from 'pako'
import { WordExplanation } from '../types'
import inflections from '../nlp/inflections.json'
import irregular from '../nlp/irregular-inflections.json'

/**
 * Ordered keys to look up for a surface word: the surface form first, then its
 * lemma from inflections.json (so inflected forms hit the base-form dictionary).
 */
export const getLemmaKeys = (word: string): string[] => {
  const lower = word.toLowerCase()
  const lemma = (inflections as Record<string, string>)[lower]
  return lemma && lemma !== lower ? [lower, lemma] : [lower]
}

/**
 * Ordered, de-duplicated lookup candidates for a surface word:
 * surface form first, then the inflections.json lemma, then suffix-stripped
 * bases (-ies/-es/-s/-ed/-ing). Surface-first ensures derived words that have
 * their own entry (building/meeting) are used as-is rather than mis-resolved.
 * Stub — real candidate generation implemented in the Green step.
 */
export const getLookupCandidates = (word: string): string[] => {
  const lower = word.toLowerCase()
  const out: string[] = []
  const push = (w: string) => { if (w && w.length >= 2 && !out.includes(w)) out.push(w) }

  // Irregular inflection (being->be, said->say, children->child): resolve to the base
  // FIRST so a rare homograph entry (e.g. the b2 noun "being") doesn't shadow the far
  // more common inflection. Regular derived words (building/meeting) are NOT in the
  // irregular map, so they keep surface-first and use their own entry.
  const irr = (irregular as Record<string, string>)[lower]
  if (irr) push(irr)

  push(lower)

  const lemma = (inflections as Record<string, string>)[lower]
  if (lemma) push(lemma)

  if (lower.endsWith('ies')) push(lower.slice(0, -3) + 'y') // cities -> city
  if (lower.endsWith('es')) push(lower.slice(0, -2)) // boxes -> box
  if (lower.endsWith('s')) push(lower.slice(0, -1)) // victims -> victim
  if (lower.endsWith('ed')) { push(lower.slice(0, -2)); push(lower.slice(0, -1)) } // suffered -> suffer; used -> use
  if (lower.endsWith('ing')) { push(lower.slice(0, -3)); push(lower.slice(0, -3) + 'e') } // making -> mak/make

  // Doubled-consonant regular forms: running -> run, stopped -> stop.
  if (lower.endsWith('ing') || lower.endsWith('ed')) {
    const stem = lower.slice(0, lower.endsWith('ing') ? -3 : -2)
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(stem.slice(0, -1))
  }

  // Comparative / superlative: faster -> fast, bigger -> big, happier -> happy, largest -> large.
  if (lower.endsWith('ier')) push(lower.slice(0, -3) + 'y')
  else if (lower.endsWith('er')) {
    push(lower.slice(0, -2)); push(lower.slice(0, -1))
    const stem = lower.slice(0, -2)
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(stem.slice(0, -1))
  }
  if (lower.endsWith('iest')) push(lower.slice(0, -4) + 'y')
  else if (lower.endsWith('est')) {
    push(lower.slice(0, -3)); push(lower.slice(0, -2))
    const stem = lower.slice(0, -3)
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(stem.slice(0, -1))
  }

  return out
}

const DB_NAME = 'll_dictionary_db'
const DB_VERSION = 4
const STORES = {
  WORDS: 'words' as const,
  USER: 'user_words' as const,
  META: 'meta' as const,
  AI_CACHE: 'ai_cache' as const
}

export interface AiCacheEntry {
  word: string
  meaning: string
  ipa_us?: string
  ipa_uk?: string
  source?: string
}

interface DictionaryDB extends DBSchema {
  [STORES.WORDS]: { key: string; value: WordExplanation }
  [STORES.USER]: { key: string; value: WordExplanation }
  [STORES.META]: { key: string; value: any }
  [STORES.AI_CACHE]: { key: string; value: AiCacheEntry }
}

let dbPromise: Promise<IDBPDatabase<DictionaryDB>> | null = null

export const initDB = async () => {
  if (dbPromise) return dbPromise
  dbPromise = openDB<DictionaryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.WORDS)) db.createObjectStore(STORES.WORDS, { keyPath: 'word' })
      if (!db.objectStoreNames.contains(STORES.USER)) db.createObjectStore(STORES.USER, { keyPath: 'word' })
      if (!db.objectStoreNames.contains(STORES.META)) db.createObjectStore(STORES.META)
      if (!db.objectStoreNames.contains(STORES.AI_CACHE)) db.createObjectStore(STORES.AI_CACHE, { keyPath: 'word' })
    },
  })
  return dbPromise
}

/** Read cached AI-backfilled glosses, keyed by lowercased word. */
export const getAiCache = async (words: string[]): Promise<Record<string, AiCacheEntry>> => {
  const db = await initDB()
  const results: Record<string, AiCacheEntry> = {}
  await Promise.all(words.map(async (w) => {
    const lower = w.toLowerCase()
    const entry = await db.get(STORES.AI_CACHE, lower)
    if (entry) results[lower] = entry
  }))
  return results
}

/** Persist AI-backfilled glosses (keyed by lowercased word). */
export const putAiCache = async (entries: AiCacheEntry[]): Promise<void> => {
  if (entries.length === 0) return
  const db = await initDB()
  const tx = db.transaction(STORES.AI_CACHE, 'readwrite')
  const store = tx.objectStore(STORES.AI_CACHE)
  await Promise.all(entries.map(e => store.put({ ...e, word: e.word.toLowerCase() })))
  await tx.done
}

export const checkAndUpdateDictionary = async () => {
  const db = await initDB()
  const localVersion = (await db.get(STORES.META, 'version_info'))?.version || 0

  try {
    const res = await fetch(chrome.runtime.getURL(`data/version.json?t=${Date.now()}`))
    if (!res.ok) return
    const { version: remoteVersion } = await res.json()

    if (remoteVersion > localVersion) {
      await importDictionary(db, remoteVersion)
    }
  } catch (e) {
    console.error('Dictionary update check failed:', e)
  }
}

const importDictionary = async (db: IDBPDatabase<DictionaryDB>, version: number) => {
  const res = await fetch(chrome.runtime.getURL(`data/dictionary-core.json.gz?t=${version}`))
  const buffer = await res.arrayBuffer()
  const data: WordExplanation[] = JSON.parse(pako.inflate(new Uint8Array(buffer), { to: 'string' }))

  const tx = db.transaction(STORES.WORDS, 'readwrite')
  const store = tx.objectStore(STORES.WORDS)
  await store.clear()

  const CHUNK_SIZE = 2000
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    await Promise.all(data.slice(i, i + CHUNK_SIZE).map(item => 
      store.put({ ...item, word: item.word.toLowerCase() })
    ))
  }
  
  await tx.done
  await db.put(STORES.META, { version, lastUpdated: Date.now() }, 'version_info')
}

/**
 * Force the local dictionary cache to be refreshable regardless of the
 * version-greater-than gate: clears the WORDS + AI_CACHE stores and drops the
 * stored version_info so the next checkAndUpdateDictionary re-imports the bundled
 * dictionary. Deliberately does NOT touch user_words / saved vocabulary.
 */
export const resetDictionaryCache = async () => {
  const db = await initDB()
  await db.clear(STORES.WORDS)
  await db.clear(STORES.AI_CACHE)
  await db.delete(STORES.META, 'version_info')
}

/** Reset the cache and immediately re-import the bundled dictionary. */
export const forceReimportDictionary = async () => {
  await resetDictionaryCache()
  await checkAndUpdateDictionary()
}

export const lookupWordInDB = async (word: string): Promise<WordExplanation | undefined> => {
  const db = await initDB()
  // Core dictionary (words) takes precedence over the user_words snapshot, so a
  // corrected core entry is never shadowed by a stale saved copy. Within each
  // store: surface form first, then lemma / suffix-stripped bases.
  const candidates = getLookupCandidates(word)
  for (const key of candidates) {
    const res = await db.get(STORES.WORDS, key)
    if (res) return res
  }
  for (const key of candidates) {
    const res = await db.get(STORES.USER, key)
    if (res) return res
  }
  return undefined
}

export const batchLookupWords = async (words: string[]): Promise<Record<string, WordExplanation>> => {
  const db = await initDB()
  const results: Record<string, WordExplanation> = {}

  await Promise.all(words.map(async (w) => {
    const lower = w.toLowerCase()
    // Core dictionary (words) first — fresh/corrected data — then user_words only
    // as a fallback for words absent from the core dict. Within each store: surface
    // form first (so building/meeting use their own entry), then lemma / suffix
    // bases. Key by the surface form so the caller's dict[surface] fallback resolves.
    const candidates = getLookupCandidates(w)
    for (const key of candidates) {
      const entry = await db.get(STORES.WORDS, key)
      if (entry) { results[lower] = entry; return }
    }
    for (const key of candidates) {
      const entry = await db.get(STORES.USER, key)
      if (entry) { results[lower] = entry; return }
    }
  }))

  return results
}
