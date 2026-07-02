import { removeFromVocabulary } from './vocabulary'
import { syncSetItem, syncRemoveItem, markSyncOverLimit, PREFIX_KNOWN } from './sync'

// Words the user marked as "already known" — suppressed from inline annotation.
// Local-only (no IndexedDB / no gloss): known words are never annotated, so they
// need no dictionary entry. Mirror of the vocabulary book, kept mutually exclusive.
const KNOWN_KEY = 'knownWords'

export const getKnownWords = async (): Promise<string[]> => {
  const data = await chrome.storage.local.get(KNOWN_KEY)
  return data[KNOWN_KEY] || []
}

export const addKnownWord = async (word: string): Promise<void> => {
  const lower = word.toLowerCase()
  const current = await getKnownWords()
  if (!current.includes(lower)) {
    await chrome.storage.local.set({ [KNOWN_KEY]: [lower, ...current] })
  }
  // Mutual exclusion: a known word must not also live in the vocabulary book.
  await removeFromVocabulary(word)
  // Cross-device: one sync key per known word. Over quota → keep local-only, flag;
  // a later successful sync clears the flag (so the banner is not sticky).
  const ok = await syncSetItem(PREFIX_KNOWN + lower, 1)
  await markSyncOverLimit(!ok)
}

export const removeKnownWord = async (word: string): Promise<void> => {
  const lower = word.toLowerCase()
  const current = await getKnownWords()
  await chrome.storage.local.set({ [KNOWN_KEY]: current.filter(w => w !== lower) })
  await syncRemoveItem(PREFIX_KNOWN + lower)
}
