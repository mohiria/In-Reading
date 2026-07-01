import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettings, saveSettings } from '../../common/storage/settings'
import { UserSettings } from '../../common/types'

// Mock chrome API
const chromeMock = {
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    sync: { get: vi.fn(), set: vi.fn() }
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

  it('should read stored settings from storage.sync (primary, cross-device)', async () => {
    const mockData = {
      enabled: true, proficiency: 'CEFR_C1', showIPA: false,
      pronunciation: 'US', engine: 'standard', llm: { provider: 'gemini', apiKey: 'sk-x' }
    }
    chromeMock.storage.sync.get.mockResolvedValue({ settings: mockData })

    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_C1')
    expect(settings.showIPA).toBe(false)
  })

  it('should migrate legacy local settings back to sync when sync is empty', async () => {
    const mockData = {
      enabled: true, proficiency: 'CEFR_B1', showIPA: false,
      pronunciation: 'US', engine: 'standard', llm: { provider: 'gemini', apiKey: '' }
    }
    chromeMock.storage.sync.get.mockResolvedValue({})
    chromeMock.storage.local.get.mockResolvedValue({ settings: mockData })

    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_B1')
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ settings: mockData })
  })

  it('should save settings to storage.sync', async () => {
    const newSettings: UserSettings = {
      enabled: true, proficiency: 'CEFR_C2', showIPA: true,
      pronunciation: 'US', engine: 'llm', llm: { provider: 'openai', apiKey: 'sk-test' }
    }
    await saveSettings(newSettings)
    expect(chromeMock.storage.sync.set).toHaveBeenCalled()
  })
})
