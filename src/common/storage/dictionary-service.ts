import { WordExplanation } from '../types'
import { checkAndUpdateDictionary, initDB } from './indexed-db'

/**
 * High-level service for dictionary lifecycle management
 */
export const initDictionaryService = async () => {
  try {
    await initDB()
    // Await the update check so the first scan after a dictionary version bump
    // reads fresh data (the re-import clears + rewrites ~5k words). A failed
    // check is non-fatal — fall through to whatever is already in IndexedDB.
    await checkAndUpdateDictionary().catch(err => console.error('Dictionary update check failed', err))
  } catch (e) {
    console.error('Failed to initialize dictionary service:', e)
  }
}

/**
 * Interface compatibility helper
 * Returns empty object to signal "dynamic lookup mode" to the scanner
 */
export const loadRemoteDictionary = async (): Promise<Record<string, WordExplanation>> => {
  await initDictionaryService()
  return {}
}
