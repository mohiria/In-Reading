import { describe, it, expect } from 'vitest'
import { extractCandidates, selectUnknownHard } from '../../content/engine/backfill'

describe('extractCandidates', () => {
  it('B1: treats a hyphenated compound as one candidate', () => {
    expect(extractCandidates('a life-threatening case appeared')).toContain('life-threatening')
  })

  it('B2: includes 3+ letter words and excludes 1-2 letter tokens', () => {
    const c = extractCandidates('a an the cat')
    expect(c).toContain('the')
    expect(c).toContain('cat')
    expect(c).not.toContain('a')
    expect(c).not.toContain('an')
  })

  it('B6: keeps an accented word whole (does not split on the accent)', () => {
    const c = extractCandidates('Meet Stéphane today')
    expect(c).toContain('Stéphane')
    expect(c).not.toContain('phane')
  })
})

describe('selectUnknownHard', () => {
  const opts = (overrides: Partial<{ resolved: string[]; everLower: string[] }> = {}) => ({
    isResolved: (w: string) => (overrides.resolved || []).includes(w),
    everLower: new Set(overrides.everLower || []),
  })

  it('B3: excludes words resolved locally', () => {
    const out = selectUnknownHard(['ubiquitous', 'the'], opts({ resolved: ['the'], everLower: ['ubiquitous', 'the'] }))
    expect(out).toContain('ubiquitous')
    expect(out).not.toContain('the')
  })

  it('B4: excludes likely proper nouns (never seen lowercase)', () => {
    const out = selectUnknownHard(['paris', 'ubiquitous'], opts({ everLower: ['ubiquitous'] }))
    expect(out).not.toContain('paris')
    expect(out).toContain('ubiquitous')
  })

  it('B5: excludes too-short words (core length < 4)', () => {
    const out = selectUnknownHard(['via', 'ubiquitous'], opts({ everLower: ['via', 'ubiquitous'] }))
    expect(out).not.toContain('via')
    expect(out).toContain('ubiquitous')
  })

  it('G1: excludes common/high-frequency words on the common-words list (e.g. "these")', () => {
    const out = selectUnknownHard(['these', 'ubiquitous'], {
      isResolved: () => false,                 // neither is in the local dict
      everLower: new Set(['these', 'ubiquitous']),
      commonWords: new Set(['these'])          // "these" is a trivial structural word
    })
    expect(out).not.toContain('these')         // gated out — not backfilled
    expect(out).toContain('ubiquitous')        // genuinely advanced — still backfilled
  })

  it('G2: an empty/absent common-words set does not exclude advanced words', () => {
    const out = selectUnknownHard(['ubiquitous'], {
      isResolved: () => false,
      everLower: new Set(['ubiquitous']),
      commonWords: new Set<string>()
    })
    expect(out).toContain('ubiquitous')
  })
})
