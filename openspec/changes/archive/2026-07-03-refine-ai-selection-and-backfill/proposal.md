## Why

Two real defects surfaced in AI-engine use: (1) selecting text, then re-selecting or closing the popup, can leave the popup showing a *stale* earlier request's translation (or a leftover "Translating…" popup) because in-flight translation requests have no identity guard; (2) the AI page-backfill translates trivially easy words (e.g. `these` at CET-4) because backfill candidate selection has no difficulty/frequency gate — and the current `inline-annotation` spec wrongly assumes "common words are inherently in the local dictionary, no frequency list required," which function words disprove.

## What Changes

- **selection-translation**: The popup ignores the result of any translation request that has been superseded by a newer selection or by closing the popup; `loading` reflects only the current request. Fixes both the stale-overwrite and the reappearing-popup symptoms.
- **inline-annotation**: Backfill candidate selection gains a triviality gate against a bundled common/high-frequency word list, so easy structural words absent from the content dictionary (e.g. `these`, `those`, `their`) are no longer backfilled. This **amends** the existing "Backfill candidate selection" requirement that claimed no frequency list is needed.
- **inline-annotation**: Document (already implemented in commit `c93f102`) that a backfilled word's selection badge names the provider — the cached source is `AI (<Provider>)`, not a bare `AI`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `selection-translation`: add a requirement that superseded/cancelled translation requests are ignored (only the latest selection's result is applied; loading state is per-current-request).
- `inline-annotation`: amend "Backfill candidate selection" to require excluding common/high-frequency words via a bundled list; add a scenario that the backfill cache/annotation carries the provider-named source.

## Impact

- Code: `src/content/components/SelectionPopup.tsx` (request-generation guard + loading reset), `src/content/engine/backfill.ts` (`selectUnknownHard` gains a common-words gate), `src/content/engine/scanner.ts` (build+pass the common-words Set), new resource `src/common/nlp/common-words.json`.
- No message-protocol change; no new dependency. True fetch cancellation is not possible in the background worker, so staleness is handled by ignoring superseded results (and optionally debouncing the network request).
- Tests: `src/test/unit/components/SelectionPopup.test.tsx`, `src/test/unit/backfill.test.ts`; existing `backfill-source.integration.test.ts` covers the provider-named badge.
