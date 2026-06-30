import { describe, it, expect } from 'vitest'
import confusionMap from '../../../public/dictionaries/confusion-map.json'
import inflections from '../../common/nlp/inflections.json'

const cm = confusionMap as Record<string, any>
const inf = inflections as Record<string, string>

// 26 words whose entries had empty translations (rendered as junk 'a. ; n. ').
const FILLED_WORDS = [
  'acid', 'across', 'act', 'below', 'bend', 'benefit', 'besides', 'best', 'bet',
  'better', 'between', 'beyond', 'bid', 'bill', 'bite', 'black', 'blame', 'blank',
  'blast', 'blend', 'block', 'blow', 'blue', 'board', 'bomb', 'book'
]

const hasEmptyTranslation = (entry: any) =>
  (entry.entries || []).some((e: any) => !e.translation || !e.translation.trim())

describe('confusion-map data integrity (#5)', () => {
  it('B4-1: the 26 previously-empty words now have non-empty glosses on every sense', () => {
    const stillEmpty = FILLED_WORDS.filter(w => hasEmptyTranslation(cm[w]))
    expect(stillEmpty).toEqual([])
  })

  it('B4-2: no confusion entry has all-empty translations (meaning never renders as POS markers only)', () => {
    const allEmpty = Object.keys(cm).filter(w => {
      const es = cm[w].entries || []
      return es.length > 0 && es.every((e: any) => !e.translation || !e.translation.trim())
    })
    expect(allEmpty).toEqual([])
  })
})

describe('inflections.json POS-correctness (#8)', () => {
  it('B4-3: does not give adverb/preposition-only words verb or plural inflections', () => {
    const badForms = ['acrossed', 'acrossing', 'acrosss', 'betweened', 'betweening', 'beyonded', 'besidesed', 'belows']
    const present = badForms.filter(k => k in inf)
    expect(present).toEqual([])
  })

  it('B4-4: keeps legitimate noun/verb inflections', () => {
    expect(inf['books']).toBe('book')
    expect(inf['acted']).toBe('act')
  })
})
