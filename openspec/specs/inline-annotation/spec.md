# inline-annotation Specification

## Purpose
TBD - created by archiving change fix-code-review-defects. Update Purpose after archive.
## Requirements
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

### Requirement: Opt-in online backfill for uncovered words

When AI is enabled (`engine === 'llm'` with an API key) and the device is online, words not resolvable from the local dictionary SHALL be backfilled via the configured LLM and then annotated. When AI is off or offline, behavior SHALL be local-only and unchanged.

#### Scenario: AI on + online annotates an uncovered advanced word

- **WHEN** AI is enabled and online, and the page contains an advanced word not in the local dictionary (e.g. a C1/C2 term)
- **THEN** that word is annotated after an asynchronous backfill, without blocking page load (local annotations appear first; the backfilled one appears progressively)

#### Scenario: AI off or offline falls back to local-only

- **WHEN** AI is disabled, or there is no network
- **THEN** only local-dictionary annotations are shown and no backfill request is made (behavior identical to before)

#### Scenario: Backfill failure is silent

- **WHEN** a backfill request fails (bad key, timeout, etc.)
- **THEN** the affected words simply remain un-annotated and no error is surfaced to the page

### Requirement: Backfill candidate selection

Backfill SHALL target only words that remain unresolved after local lookup (including lemma/suffix resolution) and that pass a triviality filter: minimum length, excluding likely proper nouns (tokens only ever seen capitalized), AND excluding common/high-frequency words listed in a bundled common-words list. The common-words list is required because some trivially easy words — notably function/structural words such as `these`, `those`, `their` — are NOT present in the content dictionary and would otherwise be treated as "unresolved" and backfilled. Words that are genuinely advanced (absent from the local dictionary and not on the common-words list) SHALL still be backfilled.

#### Scenario: Common words are not backfilled

- **WHEN** scanning a page that contains a common word absent from the content dictionary (e.g. `these`)
- **THEN** that word is excluded from the backfill request (via the common-words list), alongside words found locally, too-short words, and tokens only ever seen capitalized

#### Scenario: A genuinely advanced uncovered word is still backfilled

- **WHEN** scanning a page that contains an advanced word absent from the local dictionary and not on the common-words list (e.g. `ubiquitous`)
- **THEN** that word remains a backfill candidate and is annotated after backfill

### Requirement: Hyphenated compound words as candidates

The scanner SHALL treat hyphenated alphabetic compounds (e.g. `life-threatening`) as single candidate tokens for lookup and backfill, in addition to their individual parts.

#### Scenario: Hyphenated compound is looked up as a unit

- **WHEN** the page contains `life-threatening`
- **THEN** `life-threatening` is considered as a whole candidate (not only split into `life` and `threatening`)

### Requirement: Per-word backfill cache

Backfilled results SHALL be cached locally (IndexedDB `ai_cache`), keyed by the lowercased word, and an AI-sourced cache entry SHALL be reused on subsequent encounters without a new network request. A cache entry whose source is NOT AI-sourced (e.g. a `Youdao` gloss left by the selection popup's fallback, or a standard-mode selection) SHALL NOT be reused for backfill: it is treated as a cache miss and re-fetched via the AI batch, so inline annotations are AI-or-nothing and never surface a non-AI gloss. The per-scan backfill cap still applies.

#### Scenario: Cached AI word needs no second request

- **WHEN** a word was AI-backfilled before (cached with an `AI (...)` source) and is encountered again (same or another page)
- **THEN** its annotation comes from the local cache with no LLM request

#### Scenario: Non-AI cache entry is re-backfilled via AI

- **WHEN** a word's `ai_cache` entry has a non-AI source (e.g. `Youdao`) and the page is scanned with AI enabled
- **THEN** that word is treated as uncovered and re-fetched via the AI batch (not annotated from the stale non-AI gloss); if the AI fetch does not return it, the word remains un-annotated (never annotated from the non-AI gloss)

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

### Requirement: Hyphenated compound annotated as a single unit

A hyphenated alphabetic compound (e.g. `anti-migrant`) SHALL be treated as one token for matching and rendering. It is annotated as a single unit when the whole compound resolves (local dictionary or AI backfill); when it does not resolve, it SHALL NOT be split into separately-annotated parts.

#### Scenario: Resolved compound renders as one annotation

- **WHEN** the page contains `anti-migrant` and the whole compound resolves (in the dictionary or via AI backfill)
- **THEN** it is rendered as a single annotation covering `anti-migrant` (not two annotations for `anti` and `migrant`)

#### Scenario: Unresolved compound is not split

- **WHEN** the page contains a hyphenated compound whose whole form does not resolve, even if an individual part (e.g. `migrant`) would
- **THEN** no annotation is produced for that compound, and its parts are not separately annotated

#### Scenario: Plain word unaffected

- **WHEN** a non-hyphenated word (e.g. `migrant`) appears on its own
- **THEN** it is matched and annotated exactly as before

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

### Requirement: Backfilled annotation names the AI provider

When AI backfill produces an annotation, the stored source label SHALL name the configured provider (e.g. `AI (Kimi)`, `AI (Gemini)`), not a bare `AI`, so that a later selection of a backfilled word shows the same provider-named badge as direct selection translation.

#### Scenario: Backfilled word's selection badge names the provider

- **WHEN** a word is AI-backfilled while the configured provider is (for example) Kimi, and the user later selects that word
- **THEN** the selection popup's source badge reads `AI (Kimi)` (the provider name), consistent with the sentence/word translation badge

#### Scenario: Legacy bare-"AI" cache entry shows the current provider

- **WHEN** the selected word's cached gloss carries a legacy bare `AI` source (written before provider labeling) and an LLM provider is currently configured
- **THEN** the selection popup badge is normalized to `AI (<current provider>)`; an already-labeled `AI (X)` source is displayed unchanged (the cached provider is preserved)

