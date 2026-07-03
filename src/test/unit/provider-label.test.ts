import { describe, it, expect } from 'vitest'
import { llmProviderLabel } from '../../common/config'

describe('llmProviderLabel — provider display name for the AI source badge', () => {
  it('maps every provider to a human name (not the generic "AI")', () => {
    expect(llmProviderLabel('gemini')).toBe('Gemini')
    expect(llmProviderLabel('openai')).toBe('GPT')
    expect(llmProviderLabel('deepseek')).toBe('DeepSeek')
    expect(llmProviderLabel('moonshot')).toBe('Kimi')
    expect(llmProviderLabel('zhipu')).toBe('GLM')
    expect(llmProviderLabel('qwen')).toBe('Qwen')
    expect(llmProviderLabel('custom')).toBe('Custom')
  })

  it('claude gains a (Proxy) suffix only when a custom baseUrl is set', () => {
    expect(llmProviderLabel('claude')).toBe('Claude')
    expect(llmProviderLabel('claude', 'https://proxy.example/v1')).toBe('Claude (Proxy)')
  })
})
