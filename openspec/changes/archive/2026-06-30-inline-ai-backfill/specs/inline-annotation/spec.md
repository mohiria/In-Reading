## ADDED Requirements

### Requirement: Opt-in online backfill for uncovered words

When AI is enabled (`engine === 'llm'` with an API key) and the device is online, words not resolvable from the local dictionary SHALL be backfilled via the configured LLM and then annotated. When AI is off or offline, behavior SHALL be local-only and unchanged.

#### Scenario: AI on + online annotates an uncovered advanced word

- **WHEN** AI is enabled and online, and the page contains an advanced word not in the local dictionary (e.g. a C1/C2 term)
- **THEN** that word is annotated after an asynchronous backfill, without blocking page load (local annotations appear first; the backfilled one appears progressively)

#### Scenario: AI off or offline falls back to local-only

- **WHEN** AI is disabled, or there is no network
- **THEN** only local-dictionary annotations are shown and no backfill request is made (behavior identical to before)

#### Scenario: Backfill failure is silent

- **WHEN** a backfill request fails (bad key, timeout, etc.)
- **THEN** the affected words simply remain un-annotated and no error is surfaced to the page

### Requirement: Backfill candidate selection

Backfill SHALL target only words that remain unresolved after local lookup (including lemma/suffix resolution) and that pass a triviality filter: minimum length and excluding likely proper nouns (tokens only ever seen capitalized). Common words are inherently excluded because they are resolved by the local dictionary; no separate frequency list is required.

#### Scenario: Common words are not backfilled

- **WHEN** scanning a page
- **THEN** words found locally (common words are in the local dictionary), too-short words, or tokens only ever seen capitalized (likely proper nouns) are not included in the backfill request

### Requirement: Hyphenated compound words as candidates

The scanner SHALL treat hyphenated alphabetic compounds (e.g. `life-threatening`) as single candidate tokens for lookup and backfill, in addition to their individual parts.

#### Scenario: Hyphenated compound is looked up as a unit

- **WHEN** the page contains `life-threatening`
- **THEN** `life-threatening` is considered as a whole candidate (not only split into `life` and `threatening`)

### Requirement: Per-word backfill cache

Backfilled results SHALL be cached locally (IndexedDB), keyed by the lowercased word, and reused on subsequent encounters without a new network request.

#### Scenario: Cached word needs no second request

- **WHEN** a word was backfilled before and is encountered again (same or another page)
- **THEN** its annotation comes from the local cache with no LLM request
