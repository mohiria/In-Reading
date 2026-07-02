import { describe, it, expect, vi } from 'vitest'
import { analyzeText } from '../../common/nlp/analyzer'
import { WordExplanation } from '../../common/types'

// No real lemmatization needed here
vi.mock('../../common/nlp/inflections.json', () => ({ default: {} }))

// #2 — checkDifficulty must gate by the EASIEST sense (Math.min over per-sense CEFR),
// so a common word carrying a rare advanced sense is treated as known.
describe('Analyzer Logic — difficulty gating by easiest sense', () => {
  const mockDict: Record<string, WordExplanation> = {}

  // novel: common A2 noun (小说) + rare C1 adjective (新颖的)
  const mockConfusionMap = {
    novel: {
      word: 'novel',
      cefr: ['a2', 'c1'],
      phon_br: '/ˈnɒvl/',
      phon_n_am: '/ˈnɑːvl/',
      meaning: 'n. 小说; a. 新颖的',
      entries: [
        { type: 'noun', cefr: 'a2', phon_br: '/ˈnɒvl/', phon_n_am: '/ˈnɑːvl/', translation: '小说' },
        { type: 'adjective', cefr: 'c1', phon_br: '/ˈnɒvl/', phon_n_am: '/ˈnɑːvl/', translation: '新颖的' }
      ]
    },
    // arduous: every sense is advanced (C1)
    arduous: {
      word: 'arduous',
      cefr: ['c1'],
      phon_br: '/ˈɑːdjuəs/',
      phon_n_am: '/ˈɑːrdʒuəs/',
      meaning: 'a. 艰巨的',
      entries: [
        { type: 'adjective', cefr: 'c1', phon_br: '/ˈɑːdjuəs/', phon_n_am: '/ˈɑːrdʒuəs/', translation: '艰巨的' }
      ]
    }
  }

  it('T4: does NOT annotate a common word whose easiest sense is below the user level', () => {
    // B1 user (rank 2): min(a2=1.5, c1=5)=1.5 < 2 -> known -> not annotated.
    const results = analyzeText('I read a novel', 'CEFR_B1', new Set(), mockDict, 'US', mockConfusionMap)
    expect(results.find(r => r.word.toLowerCase() === 'novel')).toBeUndefined()
  })

  it('T5: still annotates a word whose every sense is above the user level', () => {
    const results = analyzeText('an arduous task', 'CEFR_B1', new Set(), mockDict, 'US', mockConfusionMap)
    expect(results.find(r => r.word.toLowerCase() === 'arduous')).toBeDefined()
  })
})
