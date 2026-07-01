import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../storage/settings'
import { UserSettings } from '../types'

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(data => {
      setSettings(data)
      setLoading(false)
    })

    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'sync' && changes.settings) {
        setSettings(changes.settings.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const updateSettings = async (updates: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => {
    if (!settings) return
    const next = typeof updates === 'function' ? updates(settings) : { ...settings, ...updates }
    setSettings(next)
    await saveSettings(next)
  }

  return { settings, loading, updateSettings }
}
