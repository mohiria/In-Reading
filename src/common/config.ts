import { LLMProvider } from './types'

// Recommended model per provider, shown as a gray placeholder hint in the Model
// field (display only — NOT written to settings or used as a fallback default).
export const LLM_DEFAULT_MODELS: Record<LLMProvider, string> = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.4-mini',
  claude: 'claude-haiku-4-5',
  deepseek: 'deepseek-v4-flash',
  moonshot: 'kimi-k2.6',
  zhipu: 'glm-4.7-flash',
  qwen: 'qwen3.6-flash',
  custom: 'e.g. gpt-4-turbo'
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
