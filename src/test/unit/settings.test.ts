import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettings, saveSettings } from '../../common/storage/settings'
import { UserSettings } from '../../common/types'

// Mock chrome API
const chromeMock = {
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    sync: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
  }
}
vi.stubGlobal('chrome', chromeMock)

describe('Settings Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chromeMock.storage.sync.get.mockResolvedValue({})
    chromeMock.storage.local.get.mockResolvedValue({})
  })

  it('should return default settings if nothing is stored', async () => {
    const settings = await getSettings()
    expect(settings.proficiency).toBeDefined()
    expect(settings.showIPA).toBe(true)
  })

  it('should read settings from storage.local (primary, no cloud sync)', async () => {
    const mockData = {
      enabled: true, proficiency: 'CEFR_B1', showIPA: false,
      pronunciation: 'US', engine: 'standard', llm: { provider: 'gemini', apiKey: 'sk-x' }
    }
    chromeMock.storage.local.get.mockResolvedValue({ settings: mockData })

    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_B1')
    // Already in local → no migration, and the key must not be written to sync.
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled()
    expect(chromeMock.storage.sync.remove).not.toHaveBeenCalled()
  })

  it('should migrate legacy sync settings to local and scrub the cloud copy', async () => {
    const mockData = {
      enabled: true, proficiency: 'CEFR_C1', showIPA: false,
      pronunciation: 'US', engine: 'llm', llm: { provider: 'openai', apiKey: 'sk-legacy' }
    }
    chromeMock.storage.local.get.mockResolvedValue({})
    chromeMock.storage.sync.get.mockResolvedValue({ settings: mockData })

    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_C1')
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ settings: mockData })
    expect(chromeMock.storage.sync.remove).toHaveBeenCalledWith('settings')
  })

  it('should save settings to storage.local (not sync)', async () => {
    const newSettings: UserSettings = {
      enabled: true, proficiency: 'CEFR_C2', showIPA: true,
      pronunciation: 'US', engine: 'llm', llm: { provider: 'openai', apiKey: 'sk-test' }
    }
    await saveSettings(newSettings)
    expect(chromeMock.storage.local.set).toHaveBeenCalled()
    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled()
  })
})
