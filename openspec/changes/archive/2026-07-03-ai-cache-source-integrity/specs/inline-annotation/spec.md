## MODIFIED Requirements

### Requirement: Per-word backfill cache

Backfilled results SHALL be cached locally (IndexedDB `ai_cache`), keyed by the lowercased word, and an AI-sourced cache entry SHALL be reused on subsequent encounters without a new network request. A cache entry whose source is NOT AI-sourced (e.g. a `Youdao` gloss left by the selection popup's fallback, or a standard-mode selection) SHALL NOT be reused for backfill: it is treated as a cache miss and re-fetched via the AI batch, so inline annotations are AI-or-nothing and never surface a non-AI gloss. The per-scan backfill cap still applies.

#### Scenario: Cached AI word needs no second request

- **WHEN** a word was AI-backfilled before (cached with an `AI (...)` source) and is encountered again (same or another page)
- **THEN** its annotation comes from the local cache with no LLM request

#### Scenario: Non-AI cache entry is re-backfilled via AI

- **WHEN** a word's `ai_cache` entry has a non-AI source (e.g. `Youdao`) and the page is scanned with AI enabled
- **THEN** that word is treated as uncovered and re-fetched via the AI batch (not annotated from the stale non-AI gloss); if the AI fetch does not return it, the word remains un-annotated (never annotated from the non-AI gloss)
