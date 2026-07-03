# QA Test Report — refine-ai-selection-and-backfill

## Scope

Two delta specs implemented with TDD:
- `selection-translation`: superseded translation requests are ignored (fixes stale-overwrite + reappearing-popup).
- `inline-annotation`: backfill excludes common/high-frequency words; backfilled cache names the provider (already shipped, verified).

## Execution Summary

- Command: `npx vitest run` → **116 passed / 0 failed** (110 baseline + R1/R2/G1/G2 + P1/P2-badge).
- Build: `npm run build` (tsc + vite) → passed, no type errors.

## TDD Evidence

| ID | Layer | Red evidence (assertion-level) | Green |
| --- | --- | --- | --- |
| R1 | unit (component) | `expected null to be truthy` — current selection's result "乙译文" was gone because the stale earlier response overwrote it (last-writer-wins) | Pass after `genRef` guard: stale response ignored, current result shown |
| R2 | unit (component) | guard test (close + late response) — no reopen, no leftover "Translating…" | Pass |
| G1 | unit | `expected [ 'these', 'ubiquitous' ] to not include 'these'` — no common-words gate, "these" was backfilled | Pass after `commonWords` gate: "these" excluded, "ubiquitous" kept |
| G2 | unit | (guard) empty common-words set does not drop advanced words | Pass |
| B1 | integration | pre-existing (`backfill-source.integration.test.ts`): cache stores `AI (Kimi)` | Pass (no code change; shipped in c93f102) |
| P1-badge | unit (component) | `expected null to be truthy` — a legacy bare-`AI` cache entry rendered a bare `AI` badge (source frozen before c93f102) | Pass after `displaySource` normalizes bare `AI` → `AI (current provider)` |
| P2-badge | unit (component) | (guard) an `AI (GPT)` cached source must not be rewritten | Pass — preserved unchanged |

## Production changes

- `src/content/components/SelectionPopup.tsx`: `genRef` monotonic generation; captured at handler start; guards after async local lookup and at the top of the `sendMessage` callback; `setLoading(false)` added to the collapse/invalid and local-hit early returns.
- `src/content/engine/backfill.ts`: `UnknownHardOpts.commonWords?` + `if (opts.commonWords?.has(w)) continue`.
- `src/content/engine/scanner.ts`: import `common-words.json`, build `COMMON_WORDS` set once, pass into `selectUnknownHard`.
- `src/common/nlp/common-words.json`: new resource.

## Regression

Full suite green (114). Existing SelectionPopup tests (T1 sentence, C1/C2 cache, K5 known, standardization) and backfill B1–B6 selection tests unaffected.

## Non-TDD / deferred

- Task 2.3 (network-dispatch debounce): skipped — the generation guard fixes both reported bugs; a debounce adds popup latency. Documented future option.
- Task 5.3 (manual smoke on a live page): deferred to the user.
- Pre-existing `ai_cache` entries stored with a bare `AI` source (before c93f102) are not migrated; they self-correct as the cache refreshes / words drop out of backfill.

## Requirement authority

The `inline-annotation` spec's prior "no frequency list required" claim is amended by this change's delta (function words like `these` are absent from the content dictionary). No assertion was weakened; no negative case removed.
