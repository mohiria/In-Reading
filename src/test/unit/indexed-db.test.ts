import { describe, it, expect } from 'vitest'
import { getLemmaKeys } from '../../common/storage/indexed-db'

// #3 — DB lookups must include the lemma so inflected forms of core-dictionary
// words (studies -> study) hit the base-form entry.
describe('getLemmaKeys — lemma-aware lookup keys', () => {
  it('B3-1: includes the lemma for an inflected form (studies -> study)', () => {
    expect(getLemmaKeys('studies')).toContain('study')
  })

  it('B3-2: includes the lemma for a verb inflection (played -> play)', () => {
    expect(getLemmaKeys('played')).toContain('play')
  })

  it('B3-3: returns only the surface form when no lemma mapping exists', () => {
    expect(getLemmaKeys('apple')).toEqual(['apple'])
  })

  it('B3-4: keeps the surface form first (exact match takes priority)', () => {
    expect(getLemmaKeys('studies')[0]).toBe('studies')
  })
})
