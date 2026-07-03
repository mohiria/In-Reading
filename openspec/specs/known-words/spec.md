# known-words Specification

## Purpose
TBD - created by archiving change known-words-whitelist. Update Purpose after archive.
## Requirements
### Requirement: Manual known-words list

The user SHALL be able to mark a word as "known" and un-mark it, from the selection popup and from the options page. The list SHALL persist locally (`chrome.storage.local`).

#### Scenario: Mark and un-mark from the selection popup

- **WHEN** the user selects a word and clicks "mark as known"
- **THEN** the word is added to the known-words list; selecting it again offers "un-mark", which removes it

#### Scenario: Manage from options

- **WHEN** the user opens the options page
- **THEN** the known-words list is shown with search and per-item removal

### Requirement: Known words and vocabulary are mutually exclusive

Marking a word as known SHALL remove it from the vocabulary book, and adding a word to the vocabulary book SHALL remove it from the known-words list. A word SHALL NOT be in both lists at once.

#### Scenario: Marking known removes from vocabulary

- **WHEN** a word is in the vocabulary book and the user marks it as known
- **THEN** it is removed from the vocabulary book and added to the known-words list

#### Scenario: Saving to vocabulary removes from known

- **WHEN** a word is in the known-words list and the user adds it to the vocabulary book
- **THEN** it is removed from the known-words list and added to the vocabulary book

### Requirement: Known words remain manually translatable

A known word SHALL still return a translation when the user actively selects it; the known status only suppresses passive inline annotation.

#### Scenario: Selecting a known word still shows its translation

- **WHEN** the user selects a known word
- **THEN** its translation is shown in the popup as usual

