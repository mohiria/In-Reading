# Lightweight Test Design — ai-cache-source-integrity

## Context

- Spec: `specs/selection-translation/spec.md` (AI-only cache; non-AI re-queried), `specs/inline-annotation/spec.md` (backfill ignores non-AI cache).
- Change: `ai_cache` holds AI glosses only; the popup neither stores nor trusts non-AI results under AI; backfill re-fetches non-AI cache entries via AI.
- Modules: `SelectionPopup.tsx`, `scanner.ts` (`runBackfill`), `backfill.ts` (`isAiSource`).
- Env: vitest + jsdom; `chrome`/indexed-db mocked.

## Requirement Authority / Conflict Gate

| Behavior | Baseline | New source | Relationship | Result |
| --- | --- | --- | --- | --- |
| Cache any translation for reuse | selection-translation "result is cached" (archived) | this change (user report: Youdao polluting AI) | amends → AI-only | Proceed |
| Backfill reuses any cache entry | inline-annotation "Per-word backfill cache" | this change | amends → non-AI re-fetched | Proceed |

## Pre-Code TDD Gate

- Behavior contract: the two delta specs' WHEN/THEN.
- Evidence type: assertion-level Red before each GREEN.
- Expected Red: S2 popup shows cached `Youdao` instead of re-querying AI; S3 `putAiCache` called for a Youdao result; S4 the Youdao-cached word is not re-fetched by backfill.

## Test Points

| ID | Test point | Source | Layer | Precondition | Expected | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | `isAiSource` predicate | design Decisions | unit | `'AI'`,`'AI (Kimi)'`,`'Youdao'`,`''` | true,true,false,false | P0 |
| S1 | background fallback unchanged | selection-translation (regression) | unit | AI ok → `AI (X)`; AI throws → `Youdao` | unchanged | P1 (existing translation tests) |
| S2 | non-AI cache hit re-queries AI | selection-translation §Non-AI re-queried | unit (component) | `getAiCache`→`{source:'Youdao'}`, `engine:'llm'`, TRANSLATE_WORD→`AI (Gemini)` | badge `AI (Gemini)`, network request sent | P0 |
| S3 | only AI results cached | selection-translation §not cached | unit (component) | TRANSLATE_WORD→`Youdao` vs `AI (X)` | putAiCache NOT called / called | P0 |
| S4 | backfill re-fetches non-AI cache | inline-annotation §re-backfilled | integration | cache has `Youdao` word + `AI (Kimi)` word | Youdao word ∈ backfill items; AI word ∉ | P0 |

## Test Data Plan

| Test | Data state | Realism basis | Setup | Isolation |
| --- | --- | --- | --- | --- |
| U1 | source strings | pure predicate (minimal-data exception) | literals | none |
| S2/S3 | one word, mocked cache + TRANSLATE_WORD cb | AI reader re-selecting a previously-Youdao word | chrome + indexed-db mocks | fresh render |
| S4 | 2 cached words (Youdao / AI) + backfill fn | page re-scan reusing cache | vi.mock indexed-db getAiCache/putAiCache | clearMocks |

## Regression Scope

Full 116 suite green — especially existing SelectionPopup C1/C2 (cache), T1 (sentence), R1/R2 (race), P1/P2-badge; backfill B1–B6 and backfill-source B1. Run `npx vitest run`.
