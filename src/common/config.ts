import { LLMProvider } from './types'

export const LLM_MODELS: Record<Exclude<LLMProvider, 'custom'>, string[]> = {
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  claude: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner']
}

export const LLM_DEFAULT_URLS: Record<LLMProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
  custom: 'https://api.your-proxy.com/v1'
}
