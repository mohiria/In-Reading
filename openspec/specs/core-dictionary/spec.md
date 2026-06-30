# core-dictionary Specification

## Purpose
TBD - created by archiving change fix-dictionary-glosses. Update Purpose after archive.
## Requirements
### Requirement: Core-dictionary glosses match their definition

Every core-dictionary (`oxford_5000.json`) entry's Chinese `translation` SHALL be a correct gloss for that entry's `word` and part of speech, consistent with its English `definition`. No entry's translation may describe a different word.

#### Scenario: Previously misaligned word shows its own meaning

- **WHEN** a word whose translation was misaligned (e.g. `appear`, `apple`, `appetite`) is annotated inline
- **THEN** it shows its own correct meaning (`appear`→出现, `apple`→苹果, `appetite`→食欲), not a neighboring word's

#### Scenario: Translation is consistent with the English definition

- **WHEN** any core-dictionary entry is checked
- **THEN** its Chinese translation matches its English `definition` for that part of speech

### Requirement: No empty core-dictionary glosses

No core-dictionary entry SHALL have an empty `translation`.

#### Scenario: Previously empty entry has a gloss

- **WHEN** an entry that previously had an empty translation (e.g. `book`, `believe`) is annotated
- **THEN** a non-empty Chinese gloss is shown

### Requirement: Regenerated artifact triggers client refresh

After correcting the source, the published dictionary artifact and its version SHALL be regenerated so existing clients re-import the corrected data.

#### Scenario: Version bump causes re-import

- **WHEN** the corrected `oxford_5000.json` is rebuilt via the generation script
- **THEN** `public/data/dictionary-core.json.gz` is regenerated and `public/data/version.json` carries a newer `version`, so the IndexedDB import refreshes on next check

