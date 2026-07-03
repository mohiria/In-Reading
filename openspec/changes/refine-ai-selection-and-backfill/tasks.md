## 1. QA test design (before any production code)

- [x] 1.1 Write `qa/test-design.md`: requirement sources (the two delta specs), representative test points with IDs, TDD Red-evidence requirement, regression scope (existing 110 tests). IDs: R1/R2/R3 (selection lifecycle), G1/G2 (backfill gate), B1 (provider badge, existing coverage).

## 2. Delta A — selection-translation: ignore superseded requests (TDD)

- [x] 2.1 RED: in `src/test/unit/components/SelectionPopup.test.tsx`, add R1 — two selections where request A resolves AFTER request B; capture both `sendMessage` callbacks and invoke A last; assert the popup shows B's data, not A's. Add R2 — close the popup (collapsed selection) while a request is in flight, then fire the late callback; assert the popup does not reappear and loading is cleared. **Red captured**: R1 failed `expected null to be truthy` (B's "乙译文" gone — overwritten by stale A).
- [x] 2.2 GREEN: in `SelectionPopup.tsx`, add `genRef` (useRef); `const gen = ++genRef.current` at the top of `handleSelection`; guard `if (gen !== genRef.current) return` after each `await` and at the top of the `sendMessage` callback; add `setLoading(false)` to the collapse/invalid early return and the local-hit early return. R1/R2 green (7/7 in file).
- [~] 2.3 (optional) Network-dispatch debounce — **skipped**: the generation guard already fixes both bugs; a debounce would add latency to the popup. Left as a noted future option.

## 3. Delta B — inline-annotation: common-words backfill gate (TDD)

- [x] 3.1 Add resource `src/common/nlp/common-words.json` — English high-frequency/function words absent from the Oxford content dictionary (includes `these`, `those`, `their`, `there`, `which`, `would`, `could`, `should`, `about`, `other`, `where`, etc.).
- [x] 3.2 RED: in `src/test/unit/backfill.test.ts`, add G1 — `selectUnknownHard` with a `commonWords` set containing `these` excludes `these`; G2 — keeps an advanced word (`ubiquitous`). **Red captured**: G1 failed `expected ['these','ubiquitous'] to not include 'these'`.
- [x] 3.3 GREEN: extend `UnknownHardOpts` with optional `commonWords: Set<string>` and add `if (opts.commonWords?.has(w)) continue` in `selectUnknownHard`. In `scanner.ts runBackfill`, import the JSON, build `COMMON_WORDS` once, and pass it into `selectUnknownHard`. G1/G2 green.

## 4. Delta B2 — provider-named backfill badge (already implemented; verify)

- [x] 4.1 Confirmed `src/test/integration/backfill-source.integration.test.ts` covers B1 (cache stores `AI (Kimi)`); passes. No new production code (shipped in c93f102).

## 5. Verification & report

- [x] 5.1 `npx vitest run` all green (114 = existing 110 + R1/R2/G1/G2); `npm run build` (tsc + vite) passes.
- [x] 5.2 Write `qa/qa-report.md`: TDD Red/Green evidence per test ID, execution results, regression status.
- [ ] 5.3 Manual smoke (user-facing, deferred to user): AI on + CET-4 — `these`/`those` no longer annotated, an advanced word still is; select a long sentence then immediately re-select a word → only the word result shows, no residual popup; a backfilled word's selection badge reads `AI (<model>)`.
