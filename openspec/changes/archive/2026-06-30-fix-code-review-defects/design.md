## Context

The `dev` rework introduced a confusion-map dictionary tier, lemmatization, and a heuristic content-filter rewrite. A high-effort review confirmed 10 defects. This design fixes them in 4 batches ordered by severity and blast radius, each an independently verifiable commit. The full plan lives at `.claude/plans/code-review-sorted-garden.md`; this document records the technical decisions.

Key code paths: `analyzeText` (`src/common/nlp/analyzer.ts`) resolves a word against confusion-map (Dictionary A) then IndexedDB (Dictionary B) and gates by difficulty; `scanAndHighlight`/`isLikelyUI` (`src/content/engine/scanner.ts`) walk and filter the DOM; `getPreferredIPA` (`src/common/utils/format.ts`) is the single IPA-selection point shared by scanner, Tooltip, SelectionPopup, and Popup; `batchLookupWords` (`src/common/storage/indexed-db.ts`) does exact-surface-form DB reads; `sync-inflections.ts` derives `inflections.json` from the confusion map.

## Goals / Non-Goals

**Goals:**
- Restore correct IPA, difficulty gating, content filtering, inflected-word coverage, TTS, and data integrity with minimal, focused changes.
- Keep each batch independently buildable, testable, and committable.
- Reuse existing single points (e.g. `getPreferredIPA`) so one fix covers all call sites.

**Non-Goals:**
- No new product features, no manifest/dependency/API changes.
- No redesign of the two-tier dictionary architecture or the heuristic-filter approach — only correct its thresholds and ordering.
- No runtime guard for empty glosses (decision: fix the data instead).

## Decisions

- **#1 IPA: fix at the single resolution point, not per entry.** Extend `getPreferredIPA` to fall back to `phon_br` (UK) / `phon_n_am` (US), and add optional `phon_br?`/`phon_n_am?` to `WordExplanation`. One change covers scanner + all three components. Alternative — normalizing confusion-map fields into `ipa_*` at load time — was rejected as a larger, lossier data transform.
- **#2 Difficulty: revert `Math.max` → `Math.min`.** Judge by the easiest sense, matching the product philosophy of hiding words the user already knows. The max variant is treated as a regression.
- **#9 TTS: re-add the keep-alive.** Restore the `setInterval(resume)` guard for `text.length > 100 && utterance.voice`, clearing on `!synth.speaking`. Self-contained in `speak()`.
- **#6/#7/#4/#10 Scanner: change together.** They all live in `isLikelyUI`/`createOptimizedWalker` and interact (landmark skip vs heuristic vs performance). #6 restores hard landmark skips to `SKIP_SELECTOR`; once landmarks are hard-skipped, #7 drops `'header'/'footer'` from `uiKeywords` (or uses word-boundary matching); #4 tightens the link-density rule and avoids pruning real nested prose; #10 stops re-serializing each element's subtree by only running the heuristic on block-level container candidates and/or memoizing text-length and link counts. They share one verification pass on real pages.
- **#3 Lemma-aware DB lookup.** Add lemmas to the candidate set in scanner candidate collection (using the already-imported `inflections.json`) and/or add a lemma + suffix fallback to `batchLookupWords`, mirroring the existing suffix logic in `lookupWordInDB`. Reuses existing data; no new source.
- **#8 POS exact match + clean regeneration.** Change `e.type.includes('verb'|'noun')` to exact equality. Because `sync-inflections.ts` writes additively (`if (!inflectionsData[inf])`), it cannot remove the bad forms already committed; regeneration must start from a base `inflections.json` cleaned of confusion-derived bad entries, not a re-run over the current file.
- **#5 LLM-drafted glosses, human-reviewed.** The 26 empty words are also empty in `oxford_5000.json`, so the pipeline cannot supply them. Generate Chinese short translations via LLM, present a draft for review, then write into each `entries[].translation` and recompute the root `meaning` in the `generate-dict` format (`"<pos-abbrev> <gloss>; ..."`). The confusion map is bundled directly, so no pipeline rerun is needed — only format parity with what the scanner renders.

## Risks / Trade-offs

- [Scanner retuning under-skips or over-skips] → Verify each batch-2 change on representative pages (BBC article, Wikipedia, pages with footer disclaimers, sidebars, reference lists) before committing; keep thresholds conservative.
- [#3 lemma fallback causes false-positive annotations] → Only resolve lemmas that exist in `inflections.json`/the DB; do not apply naive suffix stripping beyond the existing `lookupWordInDB` rules.
- [#8 regeneration accidentally drops legitimate inflections] → Diff the regenerated `inflections.json` against the old one and confirm only POS-confusion forms (adverb→verb, pronoun→noun) are removed.
- [#5 machine-drafted glosses are inaccurate] → Human review gate before write-back; verify final `meaning` string renders correctly in scanner and popups.
- [Test drift from B1/B2 behavior changes] → Update `analyzer.test.ts` and `SelectionPopup.test.tsx` assertions as part of the same batch; run `npm test` after each batch.

## Migration Plan

Sequence batches 1 → 2 → 3 → 4 (independent; order adjustable). After each: `npm run build` + `npm test`, then one Conventional-Commits commit. Final end-to-end check loads `dist/` in Chrome and walks the per-batch verification lists. Rollback is per-commit revert since batches are independent.
