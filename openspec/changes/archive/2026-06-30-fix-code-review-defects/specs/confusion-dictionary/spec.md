## ADDED Requirements

### Requirement: Non-empty glosses for confusion entries

Every confusion-map entry SHALL provide a non-empty Chinese gloss, and the derived `meaning` string SHALL never render as part-of-speech markers with no translation (e.g. `'a. ; a. ; n. '`).

#### Scenario: Previously empty word shows a real gloss

- **WHEN** a word whose entries had empty `translation` (e.g. `better`, `across`) is annotated or shown in a popup
- **THEN** a meaningful Chinese gloss is displayed, not part-of-speech markers alone

### Requirement: POS-correct inflection generation

Inflections derived from the confusion map SHALL be generated using exact part-of-speech matching, so non-verbs and non-nouns are not given verb/plural forms. The generated `inflections.json` SHALL NOT contain inflections produced by substring POS confusion (e.g. `adverb` matching `verb`, `pronoun` matching `noun`).

#### Scenario: Adverb does not receive verb inflections

- **WHEN** inflections are regenerated for an adverb-only entry (e.g. `fast` as adverb)
- **THEN** no verb forms such as `fasted`/`fasting` are written for it

#### Scenario: Pronoun does not receive plural inflections

- **WHEN** inflections are regenerated for a pronoun entry
- **THEN** no noun-plural form is written for it

#### Scenario: Regenerated file is clean of prior bad forms

- **WHEN** `inflections.json` is rebuilt after the POS fix
- **THEN** previously injected incorrect forms are removed, not merely left in place by additive writes
