## ADDED Requirements

### Requirement: Hyphenated compound annotated as a single unit

A hyphenated alphabetic compound (e.g. `anti-migrant`) SHALL be treated as one token for matching and rendering. It is annotated as a single unit when the whole compound resolves (local dictionary or AI backfill); when it does not resolve, it SHALL NOT be split into separately-annotated parts.

#### Scenario: Resolved compound renders as one annotation

- **WHEN** the page contains `anti-migrant` and the whole compound resolves (in the dictionary or via AI backfill)
- **THEN** it is rendered as a single annotation covering `anti-migrant` (not two annotations for `anti` and `migrant`)

#### Scenario: Unresolved compound is not split

- **WHEN** the page contains a hyphenated compound whose whole form does not resolve, even if an individual part (e.g. `migrant`) would
- **THEN** no annotation is produced for that compound, and its parts are not separately annotated

#### Scenario: Plain word unaffected

- **WHEN** a non-hyphenated word (e.g. `migrant`) appears on its own
- **THEN** it is matched and annotated exactly as before
