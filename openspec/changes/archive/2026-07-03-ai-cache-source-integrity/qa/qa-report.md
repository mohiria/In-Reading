# QA Test Report — ai-cache-source-integrity

## Scope

`ai_cache` made AI-only: the selection popup neither stores nor trusts non-AI results under AI, and backfill re-fetches non-AI cache entries via AI. Fallback chain (Youdao/iCIBA/Google) preserved as last resort.

## Execution Summary

- `npx vitest run` → **122 passed / 0 failed** (116 baseline + U1, S2, S3a, S3b, S4).
- `npm run build` (tsc + vite) → passed.

## TDD Evidence

| ID | Layer | Red (assertion-level) | Green |
| --- | --- | --- | --- |
| U1 | unit | n/a (pure predicate) | `isAiSource` matches `AI`/`AI (X)`, rejects Youdao/iCIBA/Google/Oxford/''/undefined |
| S2 | unit (component) | `expected [] to include 'pollutedword'` — a Youdao-cached word was served from cache, no AI request | Pass after read-gate: non-AI cache hit under AI → treated as miss → AI re-queried, badge `AI (Gemini)` |
| S3a | unit (component) | `putAiCache ... been called 1 times` — a Youdao fallback result was cached | Pass after write-gate: only `isAiSource` results cached; Youdao shown but not cached |
| S3b | unit (component) | (guard) an `AI (Gemini)` result must be cached | Pass — cached |
| S4 | integration | `expected ['phenomenon','appears'] to include 'ephemeral'` — a Youdao-cached word was reused by backfill, not re-fetched | Pass after backfill gate: non-AI cache entry routed into `misses` (re-fetched via AI); AI cache entry reused |

## Production changes

- `src/content/engine/backfill.ts`: `export isAiSource(source)` = `/^AI\b/.test(source||'')`.
- `src/content/components/SelectionPopup.tsx`: read-gate (`getAiCache` hit ignored under AI when source non-AI) + write-gate (only cache `isAiSource` results).
- `src/content/engine/scanner.ts` `runBackfill`: non-AI cache entries → `misses` (re-fetch), and skipped in the cache-hit `addGloss` loop.

## Regression

Full suite green (122). Existing SelectionPopup C1 (AI-source cache hit still instant), C2 (AI result cached), T1/R1/R2/P1/P2, backfill B1–B6 and BF-source unaffected.

## Non-TDD / notes

- Youdao/iCIBA/Google fallback itself unchanged (still保底 when AI genuinely fails). Diagnosing per-word AI failure is out of scope; visible via the service-worker `console.error('LLM translation failed, falling back to dictionary')`.
- No cache-purge migration: `resetDictionaryCache` clears `ai_cache` on extension reload, and the read/backfill gates ignore stale non-AI entries immediately.
