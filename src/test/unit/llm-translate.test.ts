import { describe, it, expect, vi, beforeEach } from 'vitest'
import { translateTextLLM } from '../../background/llm'

// A faithful, COMPLETE translation of the reported sentence — the "如果你是这些人中的一员"
// clause must survive (the old "explain the word" prompt dropped it).
const FULL = '如果你是这些人中的一员，我不是来贬低你的（我写作时往往有点刻薄）'
const SENTENCE = "If you're one of these people, I'm not here to talk down on you (I tend to be a bit harsh in my writing)"

const settings = (provider: string, model = ''): any => ({
  pronunciation: 'US',
  engine: 'llm',
  llm: { provider, apiKey: 'test-key', baseUrl: '', model }
})

const stubFetch = (payload: any) => {
  const fn = vi.fn(async (..._args: any[]) => ({ json: async () => payload }))
  vi.stubGlobal('fetch', fn as any)
  return fn
}
const okChat = (content: string) => ({ choices: [{ message: { content } }] })

describe('translateTextLLM — full-sentence translation (problem 1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('L1: returns the model’s complete translation in meaning, no IPA', async () => {
    stubFetch(okChat(FULL))
    const r: any = await translateTextLLM(SENTENCE, settings('deepseek'))
    expect(r.meaning).toBe(FULL)
    expect(r.ipa).toBeFalsy()          // sentences carry no pronunciation
    expect(String(r.source)).toContain('AI')
  })

  it('L2: prompts the model to translate the whole text, not "explain the word"', async () => {
    const fn = stubFetch(okChat(FULL))
    await translateTextLLM(SENTENCE, settings('deepseek'))
    const body = JSON.parse((fn.mock.calls[0][1] as any).body)
    const userMsg = body.messages.find((m: any) => m.role === 'user').content
    expect(userMsg).toContain(SENTENCE)                 // the full text is sent
    expect(userMsg.toLowerCase()).toContain('translate')
    expect(userMsg.toLowerCase()).not.toContain('explain the english word')
  })
})

describe('OpenAI-compatible request shape (problem 2)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('L3: does NOT send temperature 0.3 (thinking models 400 on it — "only 1 is allowed")', async () => {
    const fn = stubFetch(okChat(FULL))
    await translateTextLLM(SENTENCE, settings('moonshot'))
    const body = JSON.parse((fn.mock.calls[0][1] as any).body)
    expect(body.temperature).not.toBe(0.3)
  })

  it('L4: moonshot defaults to the fast non-thinking model moonshot-v1-8k', async () => {
    const fn = stubFetch(okChat(FULL))
    await translateTextLLM(SENTENCE, settings('moonshot'))
    const body = JSON.parse((fn.mock.calls[0][1] as any).body)
    expect(body.model).toBe('moonshot-v1-8k')
  })

  it('L5: zhipu defaults to the reliable free non-thinking model glm-4-flash', async () => {
    const fn = stubFetch(okChat(FULL))
    await translateTextLLM(SENTENCE, settings('zhipu'))
    const body = JSON.parse((fn.mock.calls[0][1] as any).body)
    expect(body.model).toBe('glm-4-flash')
  })
})
