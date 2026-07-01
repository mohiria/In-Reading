// Inline AI backfill helpers (pure logic; orchestration lives in scanner.ts).

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
}

// Words worth backfilling: not resolved locally, not too short, and not a likely
// proper noun (only ever seen capitalized). De-duplicated, lowercased.
export const selectUnknownHard = (candidates: string[], opts: UnknownHardOpts): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of candidates) {
    const w = raw.toLowerCase()
    if (seen.has(w)) continue
    seen.add(w)
    if (w.replace(/-/g, '').length < 4) continue // too short
    if (!opts.everLower.has(w)) continue // likely proper noun (never lowercase)
    if (opts.isResolved(w)) continue // already covered locally
    out.push(w)
  }
  return out
}
