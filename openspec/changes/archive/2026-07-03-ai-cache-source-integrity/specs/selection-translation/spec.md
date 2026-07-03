## MODIFIED Requirements

### Requirement: Selection translation reuses local AI cache

When a user selects a word for translation, the popup SHALL consult the local AI backfill cache (`ai_cache`) — in addition to the confusion map and core dictionary — before making any network request. A local hit with an AI-sourced gloss SHALL be shown immediately with no loading state and no network call. However, when an LLM engine is configured (`engine === 'llm'`) and the cached gloss's source is NOT AI-sourced (e.g. a legacy `Youdao` entry or one left by standard mode), the hit SHALL be treated as a miss so the selection re-queries AI rather than serving a stale non-AI gloss.

#### Scenario: Word already AI-backfilled on the page resolves instantly

- **WHEN** the user selects a word previously AI-backfilled (present in `ai_cache` with an `AI (...)` source)
- **THEN** its translation is shown immediately from the local cache, without a network request

#### Scenario: Non-AI cached entry is re-queried under AI

- **WHEN** an LLM engine is configured and the selected word's cached gloss has a non-AI source (e.g. `Youdao`)
- **THEN** the popup ignores that cached gloss and performs the AI translation request (updating the cache with the AI result on success)

#### Scenario: Genuine local miss still falls back to network

- **WHEN** the selected word is not in the confusion map, core dictionary, or AI cache
- **THEN** the existing network translation flow (LLM / dictionary / MT) is used as before

### Requirement: Selection translation result is cached

A successful network translation of a single selected word SHALL be written to the local AI cache ONLY when its source is AI-sourced, so the `ai_cache` holds AI glosses only. A non-AI fallback result (Youdao / iCIBA / Google MT) SHALL be shown for that selection but SHALL NOT be written to the cache, so a later selection re-attempts AI.

#### Scenario: Repeated selection of an AI-translated word is instant

- **WHEN** a word is translated by AI over the network once, then selected again later
- **THEN** the second selection resolves from the local cache with no network request

#### Scenario: A non-AI fallback result is not cached

- **WHEN** a single-word selection falls back to Youdao/iCIBA/Google (AI failed or is not configured) and returns a translation
- **THEN** the result is shown but not written to `ai_cache` (a later selection re-attempts AI instead of reusing the non-AI result)
