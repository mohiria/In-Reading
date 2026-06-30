import { describe, it, expect } from 'vitest'
import { toCSV } from '../../common/utils/export'
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
