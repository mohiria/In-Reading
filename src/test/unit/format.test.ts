import { describe, it, expect } from 'vitest'
import { getPreferredIPA } from '../../common/utils/format'
import { WordExplanation } from '../../common/types'

// #1 — getPreferredIPA must resolve IPA from confusion-map fields (phon_br/phon_n_am),
// not only the Oxford-shape fields (ipa_uk/ipa_us/ipa).
describe('getPreferredIPA — confusion-map pronunciation fields', () => {
  it('T1: resolves US IPA from phon_n_am when only confusion fields exist', () => {
    const entry = { word: 'about', phon_br: '/əˈbaʊt/', phon_n_am: '/əˈbaʊt/' } as WordExplanation
    expect(getPreferredIPA(entry, 'US')).toBe('/əˈbaʊt/')
  })

  it('T2: honors UK/US preference when the two regions differ', () => {
    // schedule: US /ˈskɛdʒuːl/ vs UK /ˈʃɛdʒuːl/
    const entry = { word: 'schedule', phon_br: '/ˈʃɛdʒuːl/', phon_n_am: '/ˈskɛdʒuːl/' } as WordExplanation
    expect(getPreferredIPA(entry, 'US')).toBe('/ˈskɛdʒuːl/')
    expect(getPreferredIPA(entry, 'UK')).toBe('/ˈʃɛdʒuːl/')
  })

  it('T3: still resolves the Oxford-shape ipa_us field (no regression)', () => {
    const entry = { word: 'water', ipa_us: '/ˈwɔːtər/', ipa_uk: '/ˈwɔːtə/' } as WordExplanation
    expect(getPreferredIPA(entry, 'US')).toBe('/ˈwɔːtər/')
  })
})
