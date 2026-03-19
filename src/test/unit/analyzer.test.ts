import { describe, it, expect } from 'vitest'
import { analyzeText } from '../../common/nlp/analyzer'
import { WordExplanation } from '../../common/types'

describe('Analyzer Difficulty Logic', () => {
  const mockDict: Record<string, WordExplanation> = {
    'advanced': { word: 'advanced', meaning: '高级的', tags: ['ielts', 'c1'] },
    'simple': { word: 'simple', meaning: '简单的', tags: ['zk', 'a1'] }
  }

  it('should include high-level words for beginner level', () => {
    const results = analyzeText('That is advanced', 'CEFR_A1', new Set(), mockDict)
    expect(results.some(r => r.word === 'advanced')).toBe(true)
  })

  it('should exclude low-level words for advanced level', () => {
    const results = analyzeText('That is simple', 'CEFR_C1', new Set(), mockDict)
    expect(results.some(r => r.word === 'simple')).toBe(false)
  })

  it('should always include words in user vocabulary regardless of level', () => {
    const vocab = new Set(['simple'])
    const results = analyzeText('That is simple', 'CEFR_C1', vocab, mockDict)
    expect(results.some(r => r.word === 'simple')).toBe(true)
  })
})
