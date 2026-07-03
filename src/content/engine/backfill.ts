// Inline AI backfill helpers (pure logic; orchestration lives in scanner.ts).

// True when a gloss/translation source is AI-produced (e.g. "AI", "AI (Kimi)",
// "AI (Gemini)"). The ai_cache is AI-only: non-AI sources (Youdao/iCIBA/Google/
// Oxford 5000) must not be cached, trusted, or reused for backfill under AI.
export const isAiSource = (source?: string): boolean => /^AI\b/.test(source || '')

// Candidate tokenizer: hyphenated Latin compounds (life-threatening) OR plain 3+
// letter words. Latin-letter aware (incl. accents) so "Stéphane"/"café" stay whole.
// Compound alternative is listed first so it is matched as a single token, not split.
const CANDIDATE_RE = /\p{Script=Latin}+(?:-\p{Script=Latin}+)+|\p{Script=Latin}{3,}/gu

// Returns candidate tokens: hyphenated compounds as a whole AND their 3+ letter
// parts (so AI-off local annotation of the parts is preserved), plus plain words.
export const extractCandidates = (text: string): string[] => {
  const matches = text.match(CANDIDATE_RE) || []
  const out: string[] = []
  for (const m of matches) {
    out.push(m)
    if (m.includes('-')) {
      for (const part of m.split('-')) if (part.length >= 3) out.push(part)
    }
  }
  return out
}

export interface UnknownHardOpts {
  isResolved: (word: string) => boolean // resolvable from the local dictionary (incl. lemma)
  everLower: Set<string> // words seen at least once in all-lowercase form (i.e. not a proper noun)
  commonWords?: Set<string> // high-frequency/function words to never backfill (e.g. these/those)
}

// Words worth backfilling: not resolved locally, not too short, not a likely
// proper noun (only ever seen capitalized), and not a common/high-frequency word.
// The common-words gate is required because trivially easy structural words
// (these/those/their) are absent from the content dictionary and would otherwise
// look "unresolved" and get backfilled. De-duplicated, lowercased.
export const selectUnknownHard = (candidates: string[], opts: UnknownHardOpts): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of candidates) {
    const w = raw.toLowerCase()
    if (seen.has(w)) continue
    seen.add(w)
    if (w.replace(/-/g, '').length < 4) continue // too short
    if (!opts.everLower.has(w)) continue // likely proper noun (never lowercase)
    if (opts.commonWords?.has(w)) continue // trivially easy common/function word
    if (opts.isResolved(w)) continue // already covered locally
    out.push(w)
  }
  return out
}
