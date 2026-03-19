import { WordExplanation } from '../types'
import { checkAndUpdateDictionary, initDB } from './indexed-db'

/**
 * High-level service for dictionary lifecycle management
 */
export const initDictionaryService = async () => {
  try {
    await initDB()
    // Fire and forget update check
    checkAndUpdateDictionary().catch(err => console.error('Dictionary background update failed', err))
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
