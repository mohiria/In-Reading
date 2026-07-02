## ADDED Requirements

### Requirement: Surface form preferred over inflected base

Inline dictionary lookup SHALL try the exact surface form first, and only fall back to lemma/suffix-stripped base forms when the surface form is not found. This ensures derived words that have their own dictionary entry (e.g. `building`, `meeting`, `meaning`) use their own meaning rather than being mis-resolved to a verb base.

#### Scenario: Derived noun with its own entry keeps its meaning

- **WHEN** a word like `building` is annotated and `building` exists as its own dictionary entry
- **THEN** its own entry is used (it is NOT resolved to `build`)

#### Scenario: Inflected form not in dictionary resolves to base

- **WHEN** a surface form not in the dictionary (e.g. `victims`, `suffered`, `threatening`) is encountered and its suffix-stripped base (`victim`/`suffer`/`threaten`) exists
- **THEN** the base entry is used so the word is annotated inline, consistent with selection lookup

### Requirement: Saved base word highlights its inflected forms

When a base word is saved to the vocabulary, its inflected surface forms SHALL also be treated as saved (highlighted), by matching the resolved entry's base word in addition to the surface and lemma forms.

#### Scenario: Saving the base highlights the plural

- **WHEN** the user saves `victim` and a page contains `victims`
- **THEN** `victims` is annotated as a saved word (matched via the resolved base `victim`)
