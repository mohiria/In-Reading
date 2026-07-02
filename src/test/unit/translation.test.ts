import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFromYoudaoMT, fetchFromGoogle } from '../../background/services/translation'

const mockFetchJson = (payload: any) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload })) as any)
}

describe('machine translation joins all sentences (multi-sentence fix)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('MT1: Youdao MT joins every translateResult line, not just the first', async () => {
    mockFetchJson({
      translateResult: [
        [{ tgt: '第一句。' }],
        [{ tgt: '第二句。' }],
        [{ tgt: '第三句。' }]
      ]
    })
    const r = await fetchFromYoudaoMT('Sentence one. Sentence two. Sentence three.')
    expect(r.meaning).toBe('第一句。第二句。第三句。')
  })

  it('MT2: Google joins every segment, not just the first', async () => {
    mockFetchJson([[['第一句。', 'S1'], ['第二句。', 'S2']]])
    const r = await fetchFromGoogle('Sentence one. Sentence two.')
    expect(r.meaning).toBe('第一句。第二句。')
  })
})
