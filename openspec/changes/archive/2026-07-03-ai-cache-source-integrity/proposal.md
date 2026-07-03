## Why

With AI enabled, some words show a `Youdao`/`Google` source in the selection popup and even appear "AI-supplemented" on the page. Root cause: the `ai_cache` (which feeds both instant selection reuse AND inline backfill) is polluted with non-AI results. The selection popup's fallback chain (LLM → Youdao → iCIBA → Google) caches *any* single-word result — including Youdao — and `runBackfill` then **blindly reuses** cached entries without checking their source, re-annotating the word from a Youdao gloss. So a Youdao result masquerades as an AI supplement, and the word never retries AI. (Backfill itself has no Youdao fallback — its candidate identification is local and its translation is AI-only, degrading to un-annotated on failure; the pollution comes solely from the selection path.)

## What Changes

- **selection-translation**: `ai_cache` holds AI-sourced glosses only. A non-AI fallback result (Youdao/iCIBA/Google) is shown for that selection but **not cached**. A cached entry whose source is non-AI is treated as a miss while AI is configured, so the selection re-queries AI.
- **inline-annotation**: backfill treats a cached entry with a non-AI source as a miss (re-fetch via AI), so inline annotations are AI-or-nothing and never surface a Youdao gloss.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `selection-translation`: amend "Selection translation result is cached" — only AI-sourced single-word results are cached; non-AI cache entries are re-queried under AI.
- `inline-annotation`: amend the backfill cache/candidate behavior so a non-AI cache entry is not reused; it is re-backfilled via AI.

## Impact

- Code: `src/content/components/SelectionPopup.tsx` (AI-source gate on cache read + write), `src/content/engine/scanner.ts` `runBackfill` (ignore non-AI cache entries), `src/content/engine/backfill.ts` (shared `isAiSource` helper).
- No message-protocol change; the Youdao/iCIBA/Google fallback itself is preserved (still保底 shows a translation when AI genuinely fails).
- Tests: `SelectionPopup.test.tsx`, `backfill-source.integration.test.ts`.
