import { readSyncedByPrefix, syncSetItem, PREFIX_VOCAB, PREFIX_KNOWN } from './sync'
import { SavedWord } from '../types'

// Reflects the per-word storage.sync keys into chrome.storage.local (the shared
// read source used by the scanner + hooks). We deliberately reconcile ONLY
// chrome.storage.local vocabulary/knownWords — saved-word annotation is driven by
// that (runScan → getVocabulary → vocabMap), so the IndexedDB user_words mirror
// (redundant, per-page-origin) does not need reconciling here.

const VOCAB_KEY = 'vocabulary'
const KNOWN_KEY = 'knownWords'

const getLocalArray = async <T>(key: string): Promise<T[]> =>
  (((await chrome.storage.local.get(key))[key]) as T[]) || []

const applyVocabDelta = async (word: string, saved: SavedWord | undefined) => {
  const cur = await getLocalArray<SavedWord>(VOCAB_KEY)
  const has = cur.some(w => w.word.toLowerCase() === word)
  if (saved) {
    if (!has) await chrome.storage.local.set({ [VOCAB_KEY]: [saved, ...cur] })
  } else if (has) {
    await chrome.storage.local.set({ [VOCAB_KEY]: cur.filter(w => w.word.toLowerCase() !== word) })
  }
}

const applyKnownDelta = async (word: string, present: boolean) => {
  const cur = await getLocalArray<string>(KNOWN_KEY)
  const has = cur.includes(word)
  if (present && !has) await chrome.storage.local.set({ [KNOWN_KEY]: [word, ...cur] })
  else if (!present && has) await chrome.storage.local.set({ [KNOWN_KEY]: cur.filter(w => w !== word) })
}

/**
 * Applies changed sync keys to local storage. Delta-based (add when a key appears,
 * remove when it disappears), so a local-only over-limit word — which never has a
 * sync key — is never affected. Returns true if any v:/k: key changed.
 */
export const handleSyncChange = async (
  changes: Record<string, { newValue?: any }>
): Promise<boolean> => {
  let touched = false
  for (const [key, change] of Object.entries(changes)) {
    if (key.startsWith(PREFIX_VOCAB)) {
      touched = true
      await applyVocabDelta(key.slice(PREFIX_VOCAB.length), change.newValue)
    } else if (key.startsWith(PREFIX_KNOWN)) {
      touched = true
      await applyKnownDelta(key.slice(PREFIX_KNOWN.length), change.newValue !== undefined)
    }
  }
  return touched
}

/**
 * On startup: the first device (sync empty) seeds sync from local; otherwise a device
 * pulls (union-adds) synced words it doesn't have yet. Deletes made while this device
 * was offline aren't detected here — they propagate via handleSyncChange once online.
 */
export const startupReconcile = async (): Promise<void> => {
  const vSync = await readSyncedByPrefix(PREFIX_VOCAB)
  const kSync = await readSyncedByPrefix(PREFIX_KNOWN)
  const localVocab = await getLocalArray<SavedWord>(VOCAB_KEY)
  const localKnown = await getLocalArray<string>(KNOWN_KEY)

  if (Object.keys(vSync).length === 0 && Object.keys(kSync).length === 0) {
    for (const w of localVocab) await syncSetItem(PREFIX_VOCAB + w.word.toLowerCase(), w)
    for (const w of localKnown) await syncSetItem(PREFIX_KNOWN + w, 1)
    return
  }

  const haveVocab = new Set(localVocab.map(w => w.word.toLowerCase()))
  const addVocab = Object.entries(vSync).filter(([w]) => !haveVocab.has(w)).map(([, v]) => v as SavedWord)
  if (addVocab.length) await chrome.storage.local.set({ [VOCAB_KEY]: [...addVocab, ...localVocab] })

  const haveKnown = new Set(localKnown)
  const addKnown = Object.keys(kSync).filter(w => !haveKnown.has(w))
  if (addKnown.length) await chrome.storage.local.set({ [KNOWN_KEY]: [...addKnown, ...localKnown] })
}
