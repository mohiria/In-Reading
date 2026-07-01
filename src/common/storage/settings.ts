import { UserSettings, LLMProvider } from '../types'
import { LLM_DEFAULT_MODELS } from '../config'

// The recommended model becomes the default value for a provider (custom has none).
const defaultModelFor = (p: LLMProvider): string => p === 'custom' ? '' : LLM_DEFAULT_MODELS[p]

const DEFAULT_SETTINGS: UserSettings = {
  enabled: false,
  proficiency: 'CET4',
  showIPA: true,
  pronunciation: 'US',
  engine: 'standard',
  llm: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: defaultModelFor('gemini'),
    providerConfigs: {}
  }
}


export const getSettings = async (): Promise<UserSettings> => {
  let data = await chrome.storage.sync.get('settings')
  if (!data.settings) {
    const localData = await chrome.storage.local.get('settings')
    if (localData.settings) {
      data = localData
      await chrome.storage.sync.set({ settings: data.settings })
    }
  }

  const stored = data.settings || {}
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    llm: {
      ...DEFAULT_SETTINGS.llm,
      ...(stored.llm || {}),
      providerConfigs: stored.llm?.providerConfigs || {}
    }
  }
}

/**
 * Enhanced saveSettings: 
 * Automatically manages per-provider configurations without UI changes.
 */
export const saveSettings = async (settings: UserSettings): Promise<void> => {
  // 1. Get the latest stored version to see what the previous provider was
  const current = await getSettings()
  const prevProvider = current.llm.provider
  const nextProvider = settings.llm.provider
  
  const configs = settings.llm.providerConfigs || {}

  if (prevProvider !== nextProvider) {
    // SCENARIO A: Provider Switched
    // 1. Save the old values into the old provider's config backup
    configs[prevProvider] = {
      apiKey: current.llm.apiKey,
      model: current.llm.model || '',
      baseUrl: current.llm.baseUrl || ''
    }

    // 2. Load the next provider's values from backup (if any); first time in → default model
    const nextConfig = configs[nextProvider] || { apiKey: '', model: '', baseUrl: '' }
    settings.llm.apiKey = nextConfig.apiKey
    settings.llm.model = nextConfig.model || defaultModelFor(nextProvider)
    settings.llm.baseUrl = nextConfig.baseUrl
  } else {
    // SCENARIO B: Same Provider (e.g. user just updated API Key or switched Model)
    // Update the backup for the current provider
    configs[nextProvider] = {
      apiKey: settings.llm.apiKey,
      model: settings.llm.model || '',
      baseUrl: settings.llm.baseUrl || ''
    }
  }

  settings.llm.providerConfigs = configs
  await chrome.storage.sync.set({ settings })
}
