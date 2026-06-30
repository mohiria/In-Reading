import { describe, it, expect, vi } from 'vitest'
import { analyzeText } from '../../common/nlp/analyzer'
import { WordExplanation } from '../../common/types'

// Mock inflections
vi.mock('../../common/nlp/inflections.json', () => ({
  default: {
    'tears': 'tear'
  }
}))

describe('Analyzer Logic - Heteronym IPA Hiding', () => {
  const mockDict: Record<string, WordExplanation> = {}

  const mockConfusionMap = {
    'tear': {
      word: 'tear',
      cefr: ['a2', 'b1'],
      entries: [
        { type: 'noun', cefr: 'a2', phon_br: '/tɪə(r)/', phon_n_am: '/tɪr/', translation: '眼泪' },
        { type: 'verb', cefr: 'b1', phon_br: '/teə(r)/', phon_n_am: '/ter/', translation: '撕裂' }
      ]
    },
    'rose': {
      word: 'rose',
      cefr: ['b2', 'a2'],
      phon_br: '/rəʊz/', // Identical, so root has IPA
      phon_n_am: '/roʊz/',
      entries: [
        { type: 'noun', cefr: 'b2', phon_br: '/rəʊz/', phon_n_am: '/roʊz/', translation: '玫瑰' },
        { type: 'verb', cefr: 'a2', phon_br: '/rəʊz/', phon_n_am: '/roʊz/', translation: '上升' }
      ]
    }
  }

  it('should HIDE ipa for heteronyms (tear)', () => {
    const results = analyzeText('tear', 'CEFR_A1', new Set(), mockDict, 'US', mockConfusionMap)
    const match = results.find(r => r.word.toLowerCase() === 'tear')
    expect(match).toBeDefined()
    expect(match?.explanation.hideIPA).toBe(true)
    expect(match?.explanation.ipa).toBeUndefined()
  })

  it('should SHOW ipa for homographs with same pronunciation (rose)', () => {
    const results = analyzeText('rose', 'CEFR_A1', new Set(), mockDict, 'US', mockConfusionMap)
    const match = results.find(r => r.word.toLowerCase() === 'rose')
    expect(match).toBeDefined()
    expect(match?.explanation.hideIPA).toBeFalsy()
    expect(match?.explanation.ipa).toBeDefined()
  })
})

describe('Analyzer Logic - saved base word highlights inflections', () => {
  it('S1: saving base word "victim" annotates the inflected "victims"', () => {
    // dict keyed by surface form (as batchLookupWords would produce), entry word is the base.
    const dict = { victims: { word: 'victim', meaning: '受害者', cefr: ['a2'] } } as any
    // High user level so victim(a2) is NOT hard enough — only a saved-match can include it.
    const results = analyzeText('the victims fled', 'CEFR_C1', new Set(['victim']), dict, 'US', {})
    expect(results.find(r => r.word.toLowerCase() === 'victims')).toBeDefined()
  })
})

describe('Analyzer Logic - known-words whitelist suppresses annotation', () => {
  const dict = { obscure: { word: 'obscure', meaning: '晦涩的', cefr: ['c1'] } } as any

  it('K1: a hard word in knownWords is not annotated', () => {
    const results = analyzeText('an obscure reference', 'CEFR_A1', new Set(), dict, 'US', {}, new Set(['obscure']))
    expect(results.find(r => r.word.toLowerCase() === 'obscure')).toBeUndefined()
  })

  it('K2: a saved word is still annotated even if also marked known (saved wins)', () => {
    const results = analyzeText('an obscure reference', 'CEFR_A1', new Set(['obscure']), dict, 'US', {}, new Set(['obscure']))
    expect(results.find(r => r.word.toLowerCase() === 'obscure')).toBeDefined()
  })

  it('K3: a hard word NOT in knownWords is still annotated (no regression)', () => {
    const results = analyzeText('an obscure reference', 'CEFR_A1', new Set(), dict, 'US', {}, new Set())
    expect(results.find(r => r.word.toLowerCase() === 'obscure')).toBeDefined()
  })
})

describe('Analyzer Logic - hyphenated compound as a single unit', () => {
  it('A1: a resolved compound is one match spanning the whole word', () => {
    const dict = { 'anti-migrant': { word: 'anti-migrant', meaning: '反移民的', cefr: [] } } as any
    const results = analyzeText('strong anti-migrant rhetoric', 'CEFR_A1', new Set(), dict, 'US', {})
    expect(results.length).toBe(1)
    expect(results[0].word).toBe('anti-migrant')
    expect(results[0].length).toBe('anti-migrant'.length) // 12, includes the hyphen
  })

  it('A2: an unresolved compound is not split into annotated parts', () => {
    // Only the part "migrant" is in the dict, not the whole compound.
    const dict = { migrant: { word: 'migrant', meaning: '移民', cefr: [] } } as any
    const results = analyzeText('strong anti-migrant rhetoric', 'CEFR_A1', new Set(), dict, 'US', {})
    expect(results.find(r => r.word.toLowerCase() === 'migrant')).toBeUndefined()
    expect(results.length).toBe(0)
  })

  it('A3: a standalone plain word still matches (no regression)', () => {
    const dict = { migrant: { word: 'migrant', meaning: '移民', cefr: [] } } as any
    const results = analyzeText('a migrant worker', 'CEFR_A1', new Set(), dict, 'US', {})
    expect(results.find(r => r.word.toLowerCase() === 'migrant')).toBeDefined()
  })
})
