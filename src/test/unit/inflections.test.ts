import { describe, it, expect } from 'vitest'
import inflections from '../../common/nlp/inflections.json'
import irregular from '../../common/nlp/irregular-inflections.json'

const inf = inflections as Record<string, string>
const irr = irregular as Record<string, string>

describe('inflections.json — lemmatization coverage', () => {
  it('IF1: covers representative irregular verbs / plurals / comparatives', () => {
    const want: Record<string, string> = {
      said: 'say', being: 'be', been: 'be', went: 'go', gone: 'go', made: 'make',
      took: 'take', taken: 'take', children: 'child', men: 'man', women: 'woman',
      feet: 'foot', better: 'good', worse: 'bad', best: 'good'
    }
    for (const [form, lemma] of Object.entries(want)) expect(inf[form]).toBe(lemma)
  })

  it('IF2: every mapping is non-empty and no form maps to itself', () => {
    for (const [form, lemma] of Object.entries(inf)) {
      expect(lemma).toBeTruthy()
      expect(lemma).not.toBe(form)
    }
  })

  it('IF3: all curated irregular forms are merged into inflections.json', () => {
    for (const [form, lemma] of Object.entries(irr)) expect(inf[form]).toBe(lemma)
  })
})
