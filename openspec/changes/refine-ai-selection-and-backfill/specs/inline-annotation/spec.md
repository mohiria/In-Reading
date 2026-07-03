## MODIFIED Requirements

### Requirement: Backfill candidate selection

Backfill SHALL target only words that remain unresolved after local lookup (including lemma/suffix resolution) and that pass a triviality filter: minimum length, excluding likely proper nouns (tokens only ever seen capitalized), AND excluding common/high-frequency words listed in a bundled common-words list. The common-words list is required because some trivially easy words — notably function/structural words such as `these`, `those`, `their` — are NOT present in the content dictionary and would otherwise be treated as "unresolved" and backfilled. Words that are genuinely advanced (absent from the local dictionary and not on the common-words list) SHALL still be backfilled.

#### Scenario: Common words are not backfilled

- **WHEN** scanning a page that contains a common word absent from the content dictionary (e.g. `these`)
- **THEN** that word is excluded from the backfill request (via the common-words list), alongside words found locally, too-short words, and tokens only ever seen capitalized

#### Scenario: A genuinely advanced uncovered word is still backfilled

- **WHEN** scanning a page that contains an advanced word absent from the local dictionary and not on the common-words list (e.g. `ubiquitous`)
- **THEN** that word remains a backfill candidate and is annotated after backfill

## ADDED Requirements

### Requirement: Backfilled annotation names the AI provider

When AI backfill produces an annotation, the stored source label SHALL name the configured provider (e.g. `AI (Kimi)`, `AI (Gemini)`), not a bare `AI`, so that a later selection of a backfilled word shows the same provider-named badge as direct selection translation.

#### Scenario: Backfilled word's selection badge names the provider

- **WHEN** a word is AI-backfilled while the configured provider is (for example) Kimi, and the user later selects that word
- **THEN** the selection popup's source badge reads `AI (Kimi)` (the provider name), consistent with the sentence/word translation badge
