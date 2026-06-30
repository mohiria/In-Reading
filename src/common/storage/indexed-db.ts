import { openDB, DBSchema, IDBPDatabase } from 'idb'
import pako from 'pako'
import { WordExplanation } from '../types'
import inflections from '../nlp/inflections.json'

/**
 * Ordered keys to look up for a surface word: the surface form first, then its
 * lemma from inflections.json (so inflected forms hit the base-form dictionary).
 */
export const getLemmaKeys = (word: string): string[] => {
  const lower = word.toLowerCase()
  const lemma = (inflections as Record<string, string>)[lower]
  return lemma && lemma !== lower ? [lower, lemma] : [lower]
}

const DB_NAME = 'll_dictionary_db'
const DB_VERSION = 3
const STORES = {
  WORDS: 'words' as const,
  USER: 'user_words' as const,
  META: 'meta' as const
}

interface DictionaryDB extends DBSchema {
  [STORES.WORDS]: { key: string; value: WordExplanation }
  [STORES.USER]: { key: string; value: WordExplanation }
  [STORES.META]: { key: string; value: any }
}

let dbPromise: Promise<IDBPDatabase<DictionaryDB>> | null = null

export const initDB = async () => {
  if (dbPromise) return dbPromise
  dbPromise = openDB<DictionaryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.WORDS)) db.createObjectStore(STORES.WORDS, { keyPath: 'word' })
      if (!db.objectStoreNames.contains(STORES.USER)) db.createObjectStore(STORES.USER, { keyPath: 'word' })
      if (!db.objectStoreNames.contains(STORES.META)) db.createObjectStore(STORES.META)
    },
  })
  return dbPromise
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

export const lookupWordInDB = async (word: string): Promise<WordExplanation | undefined> => {
  const db = await initDB()
  const lower = word.toLowerCase()

  // Try surface form, then the inflections.json lemma (so studies -> study hits).
  for (const key of getLemmaKeys(word)) {
    const res = (await db.get(STORES.USER, key)) || (await db.get(STORES.WORDS, key))
    if (res) return res
  }

  // Simple morphological fallbacks for forms not in inflections.json.
  if (lower.endsWith('s')) return db.get(STORES.WORDS, lower.slice(0, -1))
  if (lower.endsWith('ed')) return db.get(STORES.WORDS, lower.slice(0, -2))
  if (lower.endsWith('ing')) return db.get(STORES.WORDS, lower.slice(0, -3))
  return undefined
}

export const batchLookupWords = async (words: string[]): Promise<Record<string, WordExplanation>> => {
  const db = await initDB()
  const results: Record<string, WordExplanation> = {}

  await Promise.all(words.map(async (w) => {
    const lower = w.toLowerCase()
    // Query surface form first, then the lemma; key the result by the surface
    // form so the caller's dict[surface] fallback resolves the inflected token.
    for (const key of getLemmaKeys(w)) {
      const entry = (await db.get(STORES.USER, key)) || (await db.get(STORES.WORDS, key))
      if (entry) {
        results[lower] = entry
        break
      }
    }
  }))

  return results
}
