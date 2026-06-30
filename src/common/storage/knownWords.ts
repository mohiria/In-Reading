import { removeFromVocabulary } from './vocabulary'

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
}

export const removeKnownWord = async (word: string): Promise<void> => {
  const lower = word.toLowerCase()
  const current = await getKnownWords()
  await chrome.storage.local.set({ [KNOWN_KEY]: current.filter(w => w !== lower) })
}
