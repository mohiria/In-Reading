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
  const { ipa_uk, ipa_us, ipa } = explanation
  
  let selected = ''
  if (pronunciation === 'UK') {
    selected = ipa_uk || ipa_us || ipa || ''
  } else {
    selected = ipa_us || ipa_uk || ipa || ''
  }
  
  return formatIPA(selected)
}
