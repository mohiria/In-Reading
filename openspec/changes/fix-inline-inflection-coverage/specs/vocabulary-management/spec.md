## ADDED Requirements

### Requirement: Popup vocabulary search

The popup vocabulary view SHALL provide a search box that filters the saved words by `word` or `meaning`, consistent with the Options page.

#### Scenario: Filtering in the popup

- **WHEN** the user types a query in the popup vocabulary search box
- **THEN** only words whose `word` or `meaning` matches (case-insensitive) are shown; clearing the query restores the list
