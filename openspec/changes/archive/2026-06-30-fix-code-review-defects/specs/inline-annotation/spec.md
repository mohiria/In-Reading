## ADDED Requirements

### Requirement: IPA resolution across dictionary shapes

The annotation engine SHALL resolve a word's IPA from whichever pronunciation fields the source entry provides, covering both the IndexedDB Oxford shape (`ipa_us`/`ipa_uk`/`ipa`) and the confusion-map shape (`phon_n_am`/`phon_br`). The selection SHALL honor the user's UK/US preference.

#### Scenario: Confusion-map word shows IPA inline

- **WHEN** a non-heteronym confusion-map word (e.g. `about`) is annotated with IPA display enabled
- **THEN** the inline annotation shows the phonetic transcription from `phon_n_am` (US) or `phon_br` (UK), not an empty string

#### Scenario: US/UK preference selects the matching field

- **WHEN** the user pronunciation preference is UK
- **THEN** IPA resolves to `ipa_uk || phon_br || ipa_us || phon_n_am || ipa`; for US preference the US-first order is used

#### Scenario: Oxford core-dictionary word still shows IPA

- **WHEN** a Dictionary-B (IndexedDB) word with `ipa_us`/`ipa_uk` is annotated
- **THEN** its IPA continues to display as before with no regression

### Requirement: Difficulty gating by easiest sense

A word's difficulty SHALL be judged by its easiest (lowest-rank) CEFR sense, so words the user already knows at a common meaning are not annotated.

#### Scenario: Common word with a rare hard sense is not over-annotated

- **WHEN** a word carries multiple senses (e.g. CEFR `['a1','b2']`) and the user level rank is at or above the easiest sense
- **THEN** the word is treated as known and is NOT annotated

#### Scenario: Genuinely hard word is still annotated

- **WHEN** every sense of a word is above the user's level rank
- **THEN** the word is annotated

### Requirement: Content-region filtering preserves prose and skips landmarks

The scanner SHALL skip non-content landmark regions while never pruning legitimate prose. Landmark elements (`header`, `footer`, `aside`) and roles (`banner`, `contentinfo`, `complementary`) SHALL be skipped unconditionally; heuristic UI detection SHALL NOT reject real article content.

#### Scenario: Footer/aside prose is not annotated

- **WHEN** a `<footer>` or `<aside>` contains a prose paragraph
- **THEN** the scanner skips it and injects no annotations there

#### Scenario: Content container named like a header is not dropped

- **WHEN** an element's class merely contains a substring such as `article-header` but holds real content
- **THEN** the scanner does not classify it as UI and its words remain eligible for annotation

#### Scenario: Link-dense content block is not pruned wholesale

- **WHEN** a content region (e.g. a reference/citation list or link-card titles) is link-dense but is real content
- **THEN** the scanner does not reject the entire subtree; its words remain eligible for annotation

### Requirement: Inflected-form coverage for the core dictionary

The scanner SHALL annotate inflected forms of core-dictionary base words by resolving lemmas before or during dictionary lookup, so the lemmatization benefits Dictionary B (IndexedDB), not only the in-memory confusion map.

#### Scenario: Inflected core word is annotated

- **WHEN** the page contains `studies`/`running`/`countries` and the base forms `study`/`run`/`country` exist in the core dictionary and `inflections.json`
- **THEN** the inflected occurrences are annotated using the base word's entry

### Requirement: Bounded scan performance

Content scanning SHALL avoid per-element re-scanning of subtrees, keeping the cost approximately linear in DOM size to prevent visible jank on large pages and during MutationObserver re-scans.

#### Scenario: Large page scans without quadratic cost

- **WHEN** a large article or forum thread is scanned (including SPA re-scans)
- **THEN** the UI-detection work does not re-serialize/re-query each ancestor's full subtree, and the page does not visibly freeze
