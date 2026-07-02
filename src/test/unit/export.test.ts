import { describe, it, expect } from 'vitest'
import { toCSV, parseVocabCSV, toKnownCSV, parseKnownCSV } from '../../common/utils/export'
import { SavedWord } from '../../common/types'

const word = (over: Partial<SavedWord>): SavedWord =>
  ({ word: 'about', ipa: 'əˈbaʊt', meaning: '大约', sourceUrl: 'https://x.com', timestamp: new Date(2026, 5, 17).getTime(), ...over } as SavedWord)

describe('toCSV', () => {
  it('T4: starts with UTF-8 BOM and the expected header', () => {
    const csv = toCSV([word({})])
    expect(csv.startsWith('﻿')).toBe(true)
    const firstLine = csv.replace(/^﻿/, '').split(/\r?\n/)[0]
    expect(firstLine).toBe('word,ipa,meaning,context,sourceUrl,date')
  })

  it('T5: escapes commas, quotes and newlines', () => {
    const csv = toCSV([word({ word: 'lead', meaning: 'a, b', context: 'he said "hi"\nagain' })])
    const row = csv.replace(/^﻿/, '').split(/\r?\n/).slice(1).join('\n')
    expect(row).toContain('"a, b"') // comma -> quoted
    expect(row).toContain('"he said ""hi""') // quote -> doubled, field quoted
  })

  it('T6: keeps Chinese and formats date as YYYY-MM-DD', () => {
    const csv = toCSV([word({ meaning: '大约；关于', timestamp: new Date(2026, 5, 17).getTime() })])
    expect(csv).toContain('大约；关于')
    expect(csv).toContain('2026-06-17')
  })
})

describe('parseVocabCSV', () => {
  it('V1: round-trips toCSV output back to SavedWord fields', () => {
    const original = word({ word: 'about', meaning: '大约', context: 'about now', sourceUrl: 'https://x.com', timestamp: new Date(2026, 5, 17).getTime() })
    const parsed = parseVocabCSV(toCSV([original]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0].word).toBe('about')
    expect(parsed[0].meaning).toBe('大约')
    expect(parsed[0].context).toBe('about now')
    expect(parsed[0].sourceUrl).toBe('https://x.com')
    // date is written at day granularity → timestamp lands on the same calendar day
    expect(new Date(parsed[0].timestamp).getFullYear()).toBe(2026)
    expect(new Date(parsed[0].timestamp).getMonth()).toBe(5)
    expect(new Date(parsed[0].timestamp).getDate()).toBe(17)
  })

  it('V2: parses quoted fields with commas/quotes/newlines and drops rows without a word', () => {
    const csv = toCSV([
      word({ word: 'lead', meaning: 'a, b', context: 'he said "hi"\nagain' }),
      word({ word: '', meaning: 'orphan' }),
    ])
    const parsed = parseVocabCSV(csv)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].word).toBe('lead')
    expect(parsed[0].meaning).toBe('a, b')
    expect(parsed[0].context).toBe('he said "hi"\nagain')
  })
})

describe('parseKnownCSV', () => {
  it('V3: skips header, lowercases, drops blanks/non-words and dedupes', () => {
    const list = parseKnownCSV('﻿word\nApple\napple\n\nBanana\n123\ncherry')
    expect(list).toEqual(['apple', 'banana', 'cherry'])
  })

  it('V4: round-trips toKnownCSV output', () => {
    const csv = toKnownCSV(['apple', 'banana', 'cherry'])
    expect(csv.startsWith('﻿word')).toBe(true)
    expect(parseKnownCSV(csv)).toEqual(['apple', 'banana', 'cherry'])
  })
})
