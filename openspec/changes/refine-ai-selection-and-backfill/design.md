## Context

Two independent AI-engine flows have defects:

- **Selection popup** (`src/content/components/SelectionPopup.tsx`): each `mouseup` runs `handleSelection`, which optimistically opens the popup then dispatches `chrome.runtime.sendMessage({type:'TRANSLATE_WORD',...})`. The response callback does `setSelection(prev => prev ? {...prev, explanation: res.data} : null)` and `setLoading(false)` with **no request-identity guard**. Concurrent/slow requests therefore last-writer-win into whatever popup is currently open, and the local-hit early return (`:79-84`) plus the collapse/close branch (`:60-63`) never reset `loading`, so a stale "Translating…" popup can reappear after close.
- **Inline backfill** (`src/content/engine/backfill.ts` `selectUnknownHard`): gates only by dedupe / length≥4 / not-proper-noun / not-locally-resolved. It has no difficulty or frequency gate. Function/structural words (`these`, `those`, `their`) are absent from the Oxford content dictionary and confusion-map, so `isResolved` is false and they get backfilled. Backfilled glosses carry no `cefr`, so the display-time `checkDifficulty` (`analyzer.ts:94`: empty levels → `return true`) can't gate them either.

## Goals / Non-Goals

**Goals:**
- A superseded translation request (user re-selected or closed the popup) never overwrites or re-opens the current popup; `loading` reflects only the current request.
- Trivially easy words absent from the local dictionary (function/high-frequency words) are excluded from backfill.
- Keep `selectUnknownHard` a pure, unit-testable function.

**Non-Goals:**
- True cancellation of the in-flight background fetch (not possible from the content script; we ignore superseded results instead, optionally debounce dispatch).
- Precise per-level difficulty for uncovered words (they have no CEFR). A flat common-words stoplist is sufficient for the reported class; per-level scaling of the cutoff is a possible later enhancement.
- Migrating pre-existing `ai_cache` entries that were stored with a bare `AI` source (they self-correct as the cache refreshes).

## Decisions

- **Race fix = monotonic generation guard (useRef), not AbortController or text-matching.** `const genRef = useRef(0)`; `handleSelection` starts with `const gen = ++genRef.current`. Every re-selection *and* every close (collapse/invalid branch also runs `handleSelection`) bumps the generation, implicitly invalidating prior in-flight work. After each `await` and at the top of the `sendMessage` callback, `if (gen !== genRef.current) return`. This covers both the async local lookups (`lookupWordInDB`/`getAiCache`) and the network response, and needs no message-protocol change. Alternatives: AbortController (can't reach the background fetch), comparing `res` to live `window.getSelection()` (misses the closed-popup case and races on selection timing).
- **Reset `loading` on all non-network exits.** The collapse/invalid branch and the local-hit branch call `setLoading(false)` so no orphaned loading state survives a close.
- **Backfill triviality gate = bundled common-words stoplist injected via `selectUnknownHard` opts.** Add `src/common/nlp/common-words.json` (English high-frequency/function words that the Oxford content dictionary omits). `selectUnknownHard`'s `opts` gains `commonWords: Set<string>` and a `if (opts.commonWords.has(w)) continue` gate. `scanner.ts runBackfill` builds the Set once from the imported JSON and passes it — no change to `scanAndHighlight`/content signatures. Alternative considered: have the batch LLM return a CEFR per word and reuse `checkDifficulty` — rejected as default because it still spends tokens fetching easy words before discarding them and needs prompt/parse changes (kept as a documented future option).
- **Provider-named backfill badge is already shipped** (commit `c93f102` threads `aiSource` into the cache write). This change only records it as a spec scenario and relies on the existing `backfill-source.integration.test.ts`.

## Risks / Trade-offs

- [Stoplist too aggressive drops a useful advanced word] → The list contains only high-frequency/function words; a unit test asserts a genuinely advanced word (`ubiquitous`) is still backfilled while `these` is excluded.
- [Generation guard misplaced → a valid result is dropped or a stale one slips through] → Increment at the very top of `handleSelection`; guard immediately before every `setState`/cache write; covered by an out-of-order-response component test.
- [Debounce adds latency] → Debounce (if included) applies only to the network dispatch, not to instant local-cache hits; kept short (~250ms) and optional.
