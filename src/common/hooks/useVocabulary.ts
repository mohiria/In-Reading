import { useState, useEffect } from 'react'
import { getVocabulary, addToVocabulary, removeFromVocabulary } from '../storage/vocabulary'
import { SavedWord } from '../types'

export const useVocabulary = () => {
  const [vocabulary, setVocabulary] = useState<SavedWord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await getVocabulary()
    setVocabulary(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && (changes.vocabulary || changes.user_words)) {
        refresh()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const addWord = async (word: SavedWord) => {
    console.log('useVocabulary: Adding word', word.word)
    await addToVocabulary(word)
    await refresh()
  }

  const removeWord = async (wordText: string) => {
    console.log('useVocabulary: Removing word', wordText)
    await removeFromVocabulary(wordText)
    await refresh()
  }

  return { vocabulary, loading, addWord, removeWord, refresh }
}
