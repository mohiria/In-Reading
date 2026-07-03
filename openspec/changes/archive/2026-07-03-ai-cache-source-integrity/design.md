## Context

`ai_cache` (IndexedDB) is read by two consumers: the selection popup (instant repeat, `SelectionPopup.tsx:73-74`) and inline backfill (`scanner.ts:280-281,304`). It is written by the selection popup (`SelectionPopup.tsx:110`, caches any single-word result) and by backfill (`scanner.ts:294`, AI glosses). The selection popup's translation goes through `handleTranslationRequest` (LLM → Youdao → iCIBA → Google), so its cache write can persist a non-AI source. Backfill reuses cached entries without a source check, so a polluted Youdao entry becomes an inline annotation and a permanent popup source, and AI is never retried.

## Goals / Non-Goals

**Goals:**
- `ai_cache` holds only AI-sourced glosses; non-AI results never pollute it.
- Under AI, a word backed by a non-AI cache entry (legacy pollution or standard-mode leftover) re-queries AI (popup) / re-backfills via AI (inline).
- Keep the Youdao/iCIBA/Google fallback as a last-resort so the user always gets *some* translation when AI genuinely fails.

**Non-Goals:**
- Removing the fallback chain in `handleTranslationRequest`.
- Diagnosing *why* AI fails for specific words (model output / rate-limit / network) — separate concern; surfaced via the existing `console.error` in the service worker.
- A one-time purge migration — `resetDictionaryCache` already clears `ai_cache` on extension reload, and the read-side guard ignores stale non-AI entries immediately.

## Decisions

- **Single source-of-truth predicate `isAiSource(source)`** (`/^AI\b/.test(source || '')`) in `backfill.ts`, reused by the popup and the scanner. Matches `AI`, `AI (Kimi)`, `AI (Gemini)`, etc.; excludes `Youdao`, `iCIBA`, `Youdao MT`, `Google`, `Oxford 5000`.
- **Write gate (popup)**: cache only when `isAiSource(res.data.source)` — mode-independent (the cache is conceptually AI-only). Standard-mode Youdao selections simply are not cached (minor: repeat re-queries; acceptable, backfill doesn't run in standard mode anyway).
- **Read gate (popup)**: on a cache hit, if `settings.engine === 'llm'` and `!isAiSource(hit.source)`, treat as a miss (fall through to the network AI query, which then overwrites the cache with an AI gloss on success). In standard mode the cache is left as-is (no AI to prefer).
- **Backfill gate (scanner)**: when AI is active, an entry in `cached` whose source is non-AI is moved into `misses` (re-fetched via the AI batch) and skipped by the cache-hit `addGloss` loop. Still bounded by `MAX_BACKFILL`.

## Risks / Trade-offs

- [Re-querying non-AI cache entries adds AI calls] → Bounded: once AI succeeds it overwrites the entry, so it converges to one extra call per previously-polluted word; `MAX_BACKFILL` caps the inline side.
- [Standard-mode repeat selections lose instant cache] → Minor; Youdao lookups are fast and standard mode has no AI backfill to benefit from the cache.
- [`isAiSource` false-negative on an unusual AI label] → Predicate anchors on the `AI` prefix that both `sourceLabel`/`llmProviderLabel` and the backfill `aiSource` always produce; covered by tests.
