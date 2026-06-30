## ADDED Requirements

### Requirement: Selection translation reuses local AI cache

When a user selects a word for translation, the popup SHALL consult the local AI backfill cache (`ai_cache`) — in addition to the confusion map and core dictionary — before making any network request. A local hit SHALL be shown immediately with no loading state and no network call.

#### Scenario: Word already AI-backfilled on the page resolves instantly

- **WHEN** the user selects a word that was previously AI-backfilled (present in `ai_cache`)
- **THEN** its translation is shown immediately from the local cache, without sending a translation request over the network

#### Scenario: Genuine local miss still falls back to network

- **WHEN** the selected word is not in the confusion map, core dictionary, or AI cache
- **THEN** the existing network translation flow (LLM / dictionary / MT) is used as before
