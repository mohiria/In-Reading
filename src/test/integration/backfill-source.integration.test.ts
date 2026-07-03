import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock only the AI-cache I/O; keep getLemmaKeys (and everything else) real.
const putAiCache = vi.fn(async (..._args: any[]) => {})
vi.mock('../../common/storage/indexed-db', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return { ...actual, getAiCache: vi.fn(async () => ({})), putAiCache }
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
})
