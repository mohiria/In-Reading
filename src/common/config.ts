import { LLMProvider } from './types'

// Recommended model per provider, shown as a gray placeholder hint in the Model
// field (display only — NOT written to settings or used as a fallback default).
export const LLM_DEFAULT_MODELS: Record<LLMProvider, string> = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.4-mini',
  claude: 'claude-haiku-4-5',
  deepseek: 'deepseek-v4-flash',
  moonshot: 'moonshot-v1-8k',
  zhipu: 'glm-4-flash',
  qwen: 'qwen3.6-flash',
  custom: 'e.g. gpt-4-turbo'
}

// Human display name for an LLM provider, used in the "AI (<name>)" source badge
// (and the inline-backfill AI cache) so every provider is named, not a generic "AI".
export const llmProviderLabel = (provider: LLMProvider, baseUrl?: string): string => {
  switch (provider) {
    case 'gemini': return 'Gemini'
    case 'openai': return 'GPT'
    case 'deepseek': return 'DeepSeek'
    case 'moonshot': return 'Kimi'
    case 'zhipu': return 'GLM'
    case 'qwen': return 'Qwen'
    case 'custom': return 'Custom'
    case 'claude': return baseUrl ? 'Claude (Proxy)' : 'Claude'
    default: return 'AI'
  }
}

export const LLM_DEFAULT_URLS: Record<LLMProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
  moonshot: 'https://api.moonshot.cn/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  custom: 'https://api.your-proxy.com/v1'
}
