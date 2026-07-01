import { SavedWord } from '../types'
import { initDB } from './indexed-db'
import { syncSetItem, syncRemoveItem, markSyncOverLimit, PREFIX_VOCAB, PREFIX_KNOWN } from './sync'

const USER_STORE = 'user_words'

export const getVocabulary = async (): Promise<SavedWord[]> => {
  const data = await chrome.storage.local.get('vocabulary')
  return data.vocabulary || []
}

export const addToVocabulary = async (word: SavedWord): Promise<void> => {
  // Mutual exclusion: saving a word removes it from the known-words list.
  // Inlined (not importing knownWords.ts) to avoid a circular import.
  const lower = word.word.toLowerCase()
  const knownData = await chrome.storage.local.get('knownWords')
  const known: string[] = knownData.knownWords || []
  if (known.includes(lower)) {
    await chrome.storage.local.set({ knownWords: known.filter(w => w !== lower) })
    await syncRemoveItem(PREFIX_KNOWN + lower) // propagate the mutual-exclusion removal
  }

  const current = await getVocabulary()
  // Avoid duplicates in the list
  if (current.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
    return
  }
  const updated = [word, ...current]
  await chrome.storage.local.set({ vocabulary: updated })

  // Also write to IndexedDB so the scanner can find it as a "dictionary" entry
  try {
    const db = await initDB()
    const tx = db.transaction(USER_STORE, 'readwrite')
    const store = tx.objectStore(USER_STORE)
    
    // We store it using the same format as oxford_5000
    // word is the key, and it should be lowercase in the store as per indexed-db.ts logic
    await store.put({
      ...word,
      word: word.word.toLowerCase(),
      custom: true
    })
    await tx.done
    console.log(`Saved "${word.word}" to IndexedDB user dictionary.`)
  } catch (e) {
    console.error('Failed to save word to IndexedDB:', e)
  }

  // Cross-device: one sync key per word. Over quota → keep local-only, flag for UI;
  // a later successful sync clears the flag (so the banner is not sticky).
  const ok = await syncSetItem(PREFIX_VOCAB + lower, word)
  await markSyncOverLimit(!ok)
}

export const removeFromVocabulary = async (wordText: string): Promise<void> => {
  const current = await getVocabulary()
  const updated = current.filter(w => w.word.toLowerCase() !== wordText.toLowerCase())
  await chrome.storage.local.set({ vocabulary: updated })

  // Remove from the user_words store in IndexedDB
  try {
    const db = await initDB()
    const lower = wordText.toLowerCase()
    await db.delete(USER_STORE, lower)
    console.log(`Removed "${wordText}" from IndexedDB user dictionary.`)
  } catch (e) {
    console.error('Failed to remove word from IndexedDB:', e)
  }

  await syncRemoveItem(PREFIX_VOCAB + wordText.toLowerCase())
}
