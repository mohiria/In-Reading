import { TAG_LEVEL_MAP, USER_LEVEL_RANK } from './dictionary'
import { ProficiencyLevel, WordExplanation, DictTag } from '../types'
import { getPreferredIPA } from '../utils/format'
import inflections from './inflections.json'
import defaultConfusionMap from '../../../public/dictionaries/confusion-map.json'

export interface IdentifiedWord {
  word: string
  index: number // Start index in the original text
  length: number
  explanation: WordExplanation
}

export const analyzeText = (
  text: string, 
  userLevel: ProficiencyLevel = 'CEFR_A1', 
  vocabulary: Set<string> = new Set(),
  dict: Record<string, WordExplanation> = {},
  pronunciation: 'UK' | 'US' = 'US',
  confusionMap: Record<string, any> = defaultConfusionMap,
  knownWords: Set<string> = new Set()
): IdentifiedWord[] => {
  const results: IdentifiedWord[] = []
  // Latin-letter aware (incl. accents like é/ü/ñ) so words such as "Stéphane" or
  // "café" are one token, not split at the accent. Hyphen-aware too: a hyphenated
  // compound (anti-migrant) is matched as a single token (first alternative, tried
  // greedily) rather than split into separately-annotated parts.
  const regex = /\p{Script=Latin}+(?:-\p{Script=Latin}+)+|\p{Script=Latin}{3,}/gu
  let match
  
  const activeMap = confusionMap || defaultConfusionMap

  while ((match = regex.exec(text)) !== null) {
    const word = match[0]
    const lowerWord = word.toLowerCase()
    
    // 1. Lemmatization
    const baseWord = (inflections as Record<string, string>)[lowerWord] || lowerWord
    
    // 2. Lookup Priority
    let explanation: any = activeMap[baseWord]
    
    if (explanation) {
      // Found in Dictionary A (Confusion Map)
      const hasRootIPA = explanation.phon_br || explanation.phon_n_am
      if (!hasRootIPA) {
        // Heteronym: Ensure it stays as Dictionary A and mark to hide IPA
        explanation = { ...explanation, hideIPA: true }
      }
    } else {
      // ONLY fallback to Dictionary B if NOT found in A
      explanation = dict[baseWord] || dict[lowerWord]
    }
    
    if (!explanation) continue
    
    // Create a copy and ensure preferred IPA is set correctly
    explanation = { 
      ...explanation,
      ipa: explanation.hideIPA ? undefined : getPreferredIPA(explanation, pronunciation)
    }

    // Also match the resolved entry's base word, so saving a base (victim)
    // highlights its inflected forms (victims).
    const resolvedWord = (explanation.word || '').toLowerCase()
    const isSavedWord = vocabulary.has(baseWord) || vocabulary.has(lowerWord) || (!!resolvedWord && vocabulary.has(resolvedWord))
    // Words the user marked as known suppress the difficulty path (but an explicit
    // save still wins). Three-form check mirrors isSavedWord so a known base also
    // covers its inflections.
    const isKnown = knownWords.has(baseWord) || knownWords.has(lowerWord) || (!!resolvedWord && knownWords.has(resolvedWord))
    const isHardEnough = checkDifficulty(explanation, userLevel)

    if (isSavedWord || (isHardEnough && !isKnown)) {
      results.push({
        word,
        index: match.index,
        length: word.length,
        explanation
      })
    }
  }
  
  return results
}

const checkDifficulty = (entry: WordExplanation, userLevel: ProficiencyLevel): boolean => {
  let levels = entry.cefr || []
  if (typeof levels === 'string') levels = [levels]
  
  if (levels.length === 0 && entry.entries) {
    levels = entry.entries.map(e => e.cefr as DictTag).filter(Boolean)
  }

  if (levels.length === 0) return true
  
  const wordRanks = levels.map(l => TAG_LEVEL_MAP[l.toLowerCase() as DictTag] || 3)
  // Gate by the easiest sense: a word with a common easy meaning is treated as known.
  const minDifficulty = Math.min(...wordRanks)
  const userRank = USER_LEVEL_RANK[userLevel]

  return minDifficulty >= userRank
}
