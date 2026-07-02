import { useState, useEffect } from 'react'
import { getKnownWords, addKnownWord, removeKnownWord } from '../storage/knownWords'

export const useKnownWords = () => {
  const [knownWords, setKnownWords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await getKnownWords()
    setKnownWords(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()

    const handleStorageChange = (changes: any, area: string) => {
      // Adding to the vocabulary book also mutates knownWords (mutual exclusion),
      // so refresh on either key.
      if (area === 'local' && (changes.knownWords || changes.vocabulary)) {
        refresh()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const addKnown = async (word: string) => {
    await addKnownWord(word)
    await refresh()
  }

  const removeKnown = async (word: string) => {
    await removeKnownWord(word)
    await refresh()
  }

  return { knownWords, loading, addKnown, removeKnown, refresh }
}
