## 1. QA test design

- [x] 1.1 Write `qa/test-design.md`: requirement sources (both delta specs), test points S1–S4, TDD Red-evidence requirement, regression scope (116 existing).

## 2. Shared predicate

- [x] 2.1 Add `isAiSource(source?: string): boolean` (`/^AI\b/.test(source || '')`) to `src/content/engine/backfill.ts` and export it. Unit test: matches `AI`, `AI (Kimi)`; rejects `Youdao`, `iCIBA`, `Google`, `Oxford 5000`, `''`/undefined.

## 3. Delta 1 — selection popup AI-only cache (TDD)

- [x] 3.1 RED: in `SelectionPopup.test.tsx`, S2 — `getAiCache` returns `{word, source:'Youdao'}`, `engine:'llm'`, `TRANSLATE_WORD` mock returns `AI (Gemini)`; selecting the word must send `TRANSLATE_WORD` and show `AI (Gemini)` (not the cached Youdao). S3 — a `TRANSLATE_WORD` result with `source:'Youdao'` must NOT call `putAiCache`; `AI (X)` must call it. Run, paste failure output.
- [x] 3.2 GREEN: `SelectionPopup.tsx` — read gate: on `getAiCache` hit, if `settings?.engine === 'llm' && !isAiSource(aiHit.source)` do not set `localExp` (fall through to network). Write gate: only `putAiCache` when `isAiSource(res.data.source)`.

## 4. Delta 2 — backfill ignores non-AI cache (TDD)

- [x] 4.1 RED: in `backfill-source.integration.test.ts` (or a new scanner test), S4 — seed `getAiCache` with a `source:'Youdao'` word and a `source:'AI (Kimi)'` word; inject a backfill fn; assert the Youdao word is passed to the backfill fn (re-fetched) and the AI word is not. Run, paste failure output.
- [x] 4.2 GREEN: `scanner.ts runBackfill` — treat `cached[w]` with `!isAiSource(source)` as a miss (add to `misses`); skip such entries in the `cached` `addGloss` loop.

## 5. Verify & finalize

- [x] 5.1 `npx vitest run` all green (116 + new); `npm run build` passes.
- [x] 5.2 Write `qa/qa-report.md` with Red/Green evidence per test id.
- [x] 5.3 Commit by concern; archive the change.
