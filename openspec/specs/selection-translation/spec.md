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

### Requirement: Superseded selection requests are ignored

A translation request is bound to the selection that issued it. When the user makes a new selection or closes the popup before a request resolves, that request's result SHALL NOT be applied to the popup, and the loading indicator SHALL reflect only the current (latest) request. Only the latest selection's translation is ever shown.

#### Scenario: Re-selecting before the first result discards the first request

- **WHEN** the user selects text A (a request is dispatched), then selects text B before A's response arrives, and A's response arrives after B's
- **THEN** the popup shows B's translation, and A's late response is ignored (it does not overwrite B)

#### Scenario: Closing the popup cancels a pending result

- **WHEN** a translation request is in flight and the user closes the popup (clicks away so the selection collapses)
- **THEN** the popup does not reappear when the late response arrives, and the loading indicator is cleared

#### Scenario: A local-cache hit does not leave a stale loading state

- **WHEN** a request is in flight for a prior selection and the user then selects a word resolved instantly from the local dictionary or AI cache
- **THEN** the popup shows the local result and the loading indicator does not remain stuck on from the superseded request

