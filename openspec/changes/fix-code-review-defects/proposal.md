## Why

A high-effort code review of the `dev` branch (`git diff main...HEAD`, 52 files) confirmed 10 defects from the recent confusion-map / lemmatization / content-filtering rework. The dominant one drops IPA for all ~915 confusion-map common words; others delete or clutter real content, miss inflected words, render garbage glosses, truncate long TTS, and make scanning O(n²). These directly degrade the core reading-annotation experience and need correcting before further feature work.

## What Changes

Fixes are sequenced into 4 batches by severity and blast radius (each batch = one verifiable commit):

- **Batch 1 — isolated surgical fixes (low risk):**
  - `getPreferredIPA` reads `phon_br`/`phon_n_am` so confusion-map words show IPA again (#1).
  - Difficulty gating uses the *easiest* sense (`Math.min`), not the hardest, to stop over-annotating common words (#2).
  - Restore the TTS keep-alive so utterances >100 chars are not cut off at ~15s (#9).
- **Batch 2 — content-region filtering correction (scanner):**
  - Restore unconditional skip of `<header>/<footer>/<aside>` and `role=banner/contentinfo/complementary` (#6).
  - Stop `className` substring matches from rejecting `article-header`-style content containers (#7).
  - Stop the link-density rule from pruning whole subtrees of legitimate content (#4).
  - Remove the O(n²) per-element subtree re-scan in `isLikelyUI` (#10).
- **Batch 3 — inflected-word coverage:**
  - Make IndexedDB core-dictionary lookups lemma-aware so inflected forms (studies/running/countries) get annotated (#3).
- **Batch 4 — data & build-script fixes (require regeneration):**
  - `sync-inflections` uses exact POS matching and `inflections.json` is regenerated clean, removing bogus adverb→verb / pronoun→noun forms (#8).
  - Backfill Chinese translations for 26 confusion words whose glosses are empty (LLM-drafted, human-reviewed), eliminating `'a. ; a. ; n. '` garbage (#5).

No new product features; this restores and corrects intended behavior. One non-breaking type change adds optional `phon_br?`/`phon_n_am?` to `WordExplanation`.

## Capabilities

### New Capabilities
- `inline-annotation`: How the content scanner selects words to annotate — IPA resolution across dictionary shapes, difficulty gating by user level, content-region filtering (skip UI/landmarks without dropping real content), inflected-form coverage, and scan-performance bounds.
- `text-to-speech`: Pronunciation playback requirements, including uninterrupted playback of long utterances on local browser voices.
- `confusion-dictionary`: Data-integrity requirements for the bundled confusion map and its derived `inflections.json` — non-empty glosses and POS-correct inflections.

### Modified Capabilities
<!-- None — openspec/specs/ is currently empty; all behaviors above are captured as new capability specs. -->

## Impact

- Code: `src/common/utils/format.ts`, `src/common/utils/speech.ts`, `src/common/nlp/analyzer.ts`, `src/content/engine/scanner.ts`, `src/common/storage/indexed-db.ts`, `src/common/types/index.ts`, `scripts/sync-inflections.ts`.
- Data: `public/dictionaries/confusion-map.json` (26 entries), `src/common/nlp/inflections.json` (regenerated).
- Tests: `src/test/unit/analyzer.test.ts`, `src/test/unit/components/SelectionPopup.test.tsx` may need assertion updates after B1/B2.
- No API, dependency, or manifest changes. Type change is additive/optional.
