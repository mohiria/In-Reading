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
