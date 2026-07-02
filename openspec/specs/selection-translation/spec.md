# selection-translation Specification

## Purpose
TBD - created by archiving change compound-cache-selection-fixes. Update Purpose after archive.
## Requirements
### Requirement: Selection translation reuses local AI cache

When a user selects a word for translation, the popup SHALL consult the local AI backfill cache (`ai_cache`) — in addition to the confusion map and core dictionary — before making any network request. A local hit SHALL be shown immediately with no loading state and no network call.

#### Scenario: Word already AI-backfilled on the page resolves instantly

- **WHEN** the user selects a word that was previously AI-backfilled (present in `ai_cache`)
- **THEN** its translation is shown immediately from the local cache, without sending a translation request over the network

#### Scenario: Genuine local miss still falls back to network

- **WHEN** the selected word is not in the confusion map, core dictionary, or AI cache
- **THEN** the existing network translation flow (LLM / dictionary / MT) is used as before

### Requirement: Selection translation result is cached

A successful network translation of a single selected word SHALL be written to the local AI cache so that selecting the same word again resolves instantly without another network request.

#### Scenario: Repeated selection of the same word is instant

- **WHEN** a word is translated over the network once, then selected again later
- **THEN** the second selection resolves from the local cache with no network request

