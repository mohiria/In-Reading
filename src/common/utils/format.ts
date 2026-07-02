import { WordExplanation } from '../types'

/**
 * Ensures IPA phonetic transcription is enclosed in slashes //
 * e.g. "æpl" -> "/æpl/", "/æpl/" -> "/æpl/"
 */
export const formatIPA = (ipa: string | undefined): string => {
  if (!ipa) return ''
  let trimmed = ipa.trim()
  if (!trimmed) return ''
  
  // Remove existing slashes or brackets if they exist to avoid nesting
  trimmed = trimmed.replace(/^\/|\/$/g, '').replace(/^\[|\]$/g, '')
  
  return `/${trimmed}/`
}

/**
 * Selects the preferred IPA based on user preference (UK/US)
 */
export const getPreferredIPA = (explanation: WordExplanation, pronunciation: 'UK' | 'US'): string => {
  // Oxford shape stores ipa_uk/ipa_us/ipa; confusion-map shape stores phon_br (UK) / phon_n_am (US).
  const { ipa_uk, ipa_us, ipa, phon_br, phon_n_am } = explanation

  let selected = ''
  if (pronunciation === 'UK') {
    selected = ipa_uk || phon_br || ipa_us || phon_n_am || ipa || ''
  } else {
    selected = ipa_us || phon_n_am || ipa_uk || phon_br || ipa || ''
  }

  return formatIPA(selected)
}
