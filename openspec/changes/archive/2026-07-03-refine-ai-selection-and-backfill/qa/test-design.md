# Lightweight Test Design — refine-ai-selection-and-backfill

## Context

- Requirement / Spec: `changes/refine-ai-selection-and-backfill/specs/selection-translation/spec.md` (superseded requests) and `.../specs/inline-annotation/spec.md` (backfill common-words gate + provider badge).
- Change summary: (A) ignore superseded/late translation results in the selection popup and reset loading on close/local-hit; (B) exclude common/high-frequency words from AI backfill via a bundled list; (B2) confirm backfilled cache carries `AI (<provider>)` (already shipped).
- Target modules: `src/content/components/SelectionPopup.tsx`, `src/content/engine/backfill.ts`, `src/content/engine/scanner.ts`, new `src/common/nlp/common-words.json`.
- Environment: vitest + jsdom; `chrome` mocked; no network.

## Input Sources Checked

- [x] Active Spec / acceptance criteria (the two delta specs)
- [x] Existing behavior baseline: SelectionPopup.test.tsx, backfill.test.ts, backfill-source.integration.test.ts
- [x] Code structure / changed code (SelectionPopup handler, selectUnknownHard, runBackfill)
- [x] Existing tests / historical defects (race in popup callback; no backfill difficulty gate)

## Requirement Authority / Conflict Gate

| Behavior | Existing baseline | New requirement source | Relationship | Decision authority | Result |
| --- | --- | --- | --- | --- | --- |
| Backfill excludes common words | inline-annotation spec claimed "no frequency list required" | this change's inline-annotation delta (user report: `these` backfilled) | amends | product-spec / user | Proceed |
| Late/superseded translate result | no guard today (last-writer-wins) | selection-translation delta (user report) | extends | user | Proceed |

## Pre-Code TDD Gate

- Behavior contract source: the two delta specs (WHEN/THEN scenarios).
- Ready for production code change: Yes — after Red is captured.
- Gate evidence type: Red (assertion-level) required before each GREEN task.
- Expected Red failure reason: R1 popup shows stale A data instead of B; R2 popup reappears / loading stuck; G1 `these` present in `selectUnknownHard` output; G2 baseline (already passes — regression guard).

## Test Points

| ID | Test point | Source | Layer | Input / precondition | Expected result | Assertion target | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Out-of-order responses: A resolves after B | selection-translation §Re-selecting | Unit (component) | Select A → dispatch; select B → dispatch; invoke B's cb then A's cb | Popup shows B's explanation; A ignored | rendered translation text | P0 |
| R2 | Close cancels a pending result | selection-translation §Closing | Unit (component) | Request in flight; collapse selection (close); then invoke late cb | Popup not reappearing; loading cleared | popup absent / no "Translating…" | P0 |
| R3 | Local-hit does not leave stale loading | selection-translation §local-cache | Unit (component) | In-flight prior request; select a locally-resolved word | Popup shows local result, no stuck loading | loading state | P1 |
| G1 | `these` excluded by common-words gate | inline-annotation §Common words not backfilled | Unit | `selectUnknownHard(['these','ubiquitous'], {commonWords:{these}, everLower, isResolved:false})` | output excludes `these` | array contents | P0 |
| G2 | advanced word still backfilled | inline-annotation §advanced uncovered | Unit | same call | output includes `ubiquitous` | array contents | P0 |
| B1 | backfill cache names provider | inline-annotation §badge names provider | Integration | existing backfill-source test (aiSource='AI (Kimi)') | cached source == 'AI (Kimi)' | putAiCache entry.source | P1 (existing) |

## Test Data Plan

| Test point | Required data state | Business realism basis | Setup | Isolation | Cleanup |
| --- | --- | --- | --- | --- | --- |
| R1/R2/R3 | two selections, mocked TRANSLATE_WORD callbacks | real reading flow: user re-selects/closes; sentence vs word | jsdom + chrome.runtime.sendMessage mock capturing callbacks | fresh render per test | RTL unmount |
| G1/G2 | candidate list with one common + one advanced word | CET-4 reader: `these` trivial, `ubiquitous` advanced | pure function args (unit technical assertion — minimal-data exception) | none | none |
| B1 | one hard uncovered word backfilled under provider Kimi | page backfill under configured provider | vi.mock indexed-db putAiCache | clearMocks | n/a |

## Regression Scope

Full existing suite (110 tests) must stay green — especially the current SelectionPopup tests (T1 sentence, C1/C2 cache, K5 known) and backfill B1–B6 selection tests. Run `npx vitest run`.
