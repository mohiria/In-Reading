import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock only the AI-cache I/O; keep getLemmaKeys (and everything else) real.
const { getAiCache, putAiCache } = vi.hoisted(() => ({
  getAiCache: vi.fn(async (..._args: any[]) => ({} as Record<string, any>)),
  putAiCache: vi.fn(async (..._args: any[]) => {})
}))
vi.mock('../../common/storage/indexed-db', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return { ...actual, getAiCache, putAiCache }
})

import { scanAndHighlight } from '../../content/engine/scanner'

describe('inline backfill caches the provider-labeled source', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('BF-source: putAiCache stores the injected aiSource ("AI (Kimi)"), not a bare "AI"', async () => {
    // "ubiquitous" is a hard word absent from the confusion map and not in the dict,
    // so it is locally unresolved → eligible for AI backfill.
    document.body.innerHTML =
      `<main role="main"><article><p>The ubiquitous phenomenon appears everywhere today.</p></article></main>`

    const backfill = async (items: { word: string; sentence: string }[]) => {
      const out: Record<string, { meaning: string }> = {}
      for (const it of items) if (it.word === 'ubiquitous') out[it.word] = { meaning: '无处不在的' }
      return out as any
    }

    await scanAndHighlight(
      document.body, 'CEFR_A1', new Set(), {}, 'US',
      undefined, false, true, backfill, new Set(), 'AI (Kimi)'
    )

    expect(putAiCache).toHaveBeenCalled()
    const entries = putAiCache.mock.calls[0][0] as any[]
    const ubi = entries.find(e => e.word === 'ubiquitous')
    expect(ubi).toBeTruthy()
    expect(ubi.source).toBe('AI (Kimi)')
  })

  it('S4: backfill re-fetches a non-AI cached word and reuses an AI cached word', async () => {
    document.body.innerHTML =
      `<main role="main"><article><p>The ubiquitous ephemeral phenomenon appears today.</p></article></main>`
    // ubiquitous cached as AI (reuse); ephemeral cached as Youdao (must be re-backfilled).
    getAiCache.mockResolvedValue({
      ubiquitous: { word: 'ubiquitous', meaning: 'AI义', source: 'AI (Kimi)' },
      ephemeral: { word: 'ephemeral', meaning: '旧有道', source: 'Youdao' }
    } as any)

    const requested: string[] = []
    const backfill = async (items: { word: string; sentence: string }[]) => {
      const out: Record<string, { meaning: string }> = {}
      for (const it of items) { requested.push(it.word); out[it.word] = { meaning: 'AI-' + it.word } }
      return out as any
    }

    await scanAndHighlight(
      document.body, 'CEFR_A1', new Set(), {}, 'US',
      undefined, false, true, backfill, new Set(), 'AI (Kimi)'
    )

    expect(requested).toContain('ephemeral')      // non-AI cache → re-fetched via AI
    expect(requested).not.toContain('ubiquitous') // AI cache → reused, not re-fetched
  })
})
