## ADDED Requirements

### Requirement: Known words are not annotated

A word in the user's known-words list SHALL NOT be inline-annotated, even when its CEFR level would otherwise make it annotated. Known-words suppression applies only to the difficulty path; a word explicitly saved to the vocabulary book SHALL still be annotated.

#### Scenario: A known word at/above level is not annotated

- **WHEN** a word that would normally be annotated (its level is at or above the user's level) is in the known-words list
- **THEN** it is not annotated on the page

#### Scenario: A saved word is still annotated

- **WHEN** a word is in the vocabulary book
- **THEN** it is annotated regardless of the known-words list (an explicit save takes precedence)

#### Scenario: Marking known removes annotations immediately

- **WHEN** the user marks a word as known
- **THEN** existing annotations of that word are removed without a full reload; un-marking it restores annotation
