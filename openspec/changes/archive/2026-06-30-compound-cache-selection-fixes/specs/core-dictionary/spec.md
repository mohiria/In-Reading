## ADDED Requirements

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
