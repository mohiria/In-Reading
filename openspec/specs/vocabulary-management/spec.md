# vocabulary-management Specification

## Purpose
TBD - created by archiving change vocab-book-l1. Update Purpose after archive.
## Requirements
### Requirement: Full vocabulary visibility

The user SHALL be able to view all saved words without an arbitrary count limit. The popup MAY show a preview, but the Options page SHALL list the complete vocabulary.

#### Scenario: More than 20 saved words are all visible

- **WHEN** the user has saved more than 20 words and opens the Options vocabulary section
- **THEN** every saved word is listed (not truncated to 20)

#### Scenario: Popup links to full management

- **WHEN** the user opens the popup vocabulary view
- **THEN** a "view all" entry is available that opens the Options vocabulary section

### Requirement: Time-based grouping

Saved words SHALL be grouped by their add time (`SavedWord.timestamp`) into 今天 / 本周 / 本月 / 更早, with newest first within each group.

#### Scenario: Words fall into the correct time group

- **WHEN** words were saved today, earlier this week, earlier this month, and before that
- **THEN** each appears under 今天 / 本周 / 本月 / 更早 respectively, ordered newest-first

#### Scenario: Empty groups are not shown

- **WHEN** no word was saved in a given time range
- **THEN** that group heading is not rendered

### Requirement: Search filtering

The user SHALL be able to filter the vocabulary list by a query that matches the word or its meaning.

#### Scenario: Filter narrows the list

- **WHEN** the user types a query that matches some saved words' `word` or `meaning`
- **THEN** only matching words are shown; clearing the query restores the full list

### Requirement: CSV export for Anki/Excel

The user SHALL be able to export the saved vocabulary as a UTF-8 (BOM) CSV file containing `word,ipa,meaning,context,sourceUrl,date`, downloadable from the browser, openable in Excel and importable into Anki without garbled Chinese.

#### Scenario: Export produces a downloadable CSV

- **WHEN** the user clicks export
- **THEN** a `.csv` file downloads whose header is `word,ipa,meaning,context,sourceUrl,date` and whose rows correspond to the saved words

#### Scenario: Chinese text is not garbled

- **WHEN** the exported CSV is opened in Excel or imported into Anki
- **THEN** Chinese meanings render correctly (UTF-8 BOM ensures no mojibake)

#### Scenario: Empty vocabulary export is handled

- **WHEN** the user exports with no saved words
- **THEN** either export is disabled or a header-only CSV is produced, without error

