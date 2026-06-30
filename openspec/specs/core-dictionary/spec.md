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

### Requirement: Forced dictionary cache refresh

The dictionary cache (IndexedDB `words` + `ai_cache`) SHALL be force-refreshable so that a rebuilt local dictionary always takes effect, independent of the version-greater-than gate. Forcing a refresh SHALL NOT affect the user's saved vocabulary.

#### Scenario: Extension install/reload re-imports the latest bundled dictionary

- **WHEN** the extension is installed or reloaded
- **THEN** the cached dictionary version is reset so the next page scan re-imports the latest bundled dictionary, even if the bundled version number is unchanged

#### Scenario: Manual reset clears and re-imports the dictionary

- **WHEN** the user triggers the "reset dictionary cache" action in options
- **THEN** the `words` and `ai_cache` stores are cleared and the dictionary is re-imported from the bundled data

#### Scenario: Refresh preserves saved vocabulary

- **WHEN** a forced refresh (install-time or manual) runs
- **THEN** the saved vocabulary (`user_words` and stored vocabulary) is left untouched

### Requirement: Core dictionary takes precedence over saved-word snapshot

For a word that exists in the core dictionary, lookups SHALL return the core dictionary entry rather than a saved-word snapshot (`user_words` store or `userDict`), so a corrected dictionary is never shadowed by a stale saved copy. The saved snapshot is used only for words absent from the core dictionary.

#### Scenario: Corrected core word wins over a stale saved copy

- **WHEN** a word is present in both the core dictionary (corrected) and a saved snapshot (stale)
- **THEN** the corrected core dictionary meaning is used for page annotation and selection lookup

#### Scenario: Saved word absent from core keeps its snapshot

- **WHEN** a saved word is not present in the core dictionary
- **THEN** its saved snapshot is still used so it remains annotated

