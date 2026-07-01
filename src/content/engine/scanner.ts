import { analyzeText } from '../../common/nlp/analyzer'
import { ProficiencyLevel, WordExplanation } from '../../common/types'
import { speak } from '../../common/utils/speech'
import { extractCandidates, selectUnknownHard } from './backfill'
import { getLemmaKeys, getAiCache, putAiCache, AiCacheEntry } from '../../common/storage/indexed-db'
import defaultConfusionMap from '../../../public/dictionaries/confusion-map.json'

// Shape returned by the injected backfill fn / AI cache (subset of an LLM gloss).
export interface BackfillGloss { meaning: string; ipa_us?: string; ipa_uk?: string }
export type BackfillFn = (items: { word: string; sentence: string }[]) => Promise<Record<string, BackfillGloss>>

const MAX_BACKFILL = 80 // hard cap on uncovered words backfilled per scan
const BACKFILL_BATCH = 40 // words per LLM request (mirrors fetchBatchFromLLM)
const BACKFILL_CONCURRENCY = 2 // simultaneous requests per scan
const confusionMap = defaultConfusionMap as Record<string, any>

/**
 * Constants & Configuration
 */
const REFRESH_GAP = 2 // Increased sensitivity: show word more frequently (every 2nd block instead of 4th)

/**
 * Elements and Roles that should be skipped entirely (including their children).
 * These are terminal UI elements or hidden areas that never contain readable prose.
 */
const SKIP_SELECTOR = [
  'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE', 'PRE',
  'NAV', 'BUTTON', 'LABEL', 'SELECT', 'OPTION', 'FIELDSET', 'LEGEND',
  'KBD', 'SAMP', 'VAR', 'TIME', 'DATA', 'SVG', 'CANVAS', 'MATH',
  'SUMMARY', 'DIALOG', 'MENU',
  // Landmark regions that are never article prose.
  'HEADER', 'FOOTER', 'ASIDE',
  '[role="navigation"]', '[role="button"]', '[role="menu"]', '[role="tablist"]',
  '[role="tab"]', '[role="tooltip"]', '[role="status"]', '[role="alert"]',
  '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
  '[aria-hidden="true"]'
].join(', ')

// Class tokens that unambiguously mark a UI/navigation container.
const UI_CLASS_KEYWORDS = ['sidebar', 'navbar', 'menu', 'toc', 'breadcrumb', 'pagination']
const hasUiClass = (el: HTMLElement): boolean => {
  const tokens = el.className.toString().toLowerCase().split(/\s+/).filter(Boolean)
  return tokens.some(t =>
    t.startsWith('nav-') || UI_CLASS_KEYWORDS.some(k => t === k || t.startsWith(k + '-') || t.endsWith('-' + k))
  )
}

// Block-level descendants mark an element as a structural/content wrapper rather
// than a leaf-ish UI list.
const BLOCK_SELECTOR =
  'p, div, section, article, main, aside, header, footer, ul, ol, li, table, blockquote, figure, h1, h2, h3, h4, h5, h6'

/**
 * Heuristic check if an element is likely part of a Navigation/UI area.
 * Ordered cheap-to-expensive: a class-token check runs on every element, but the
 * link-density text analysis only runs on leaf-ish containers (no block-level
 * descendants). Structural/content wrappers descend cheaply, which keeps scanning
 * roughly linear in DOM size instead of re-serializing each ancestor's subtree.
 */
const isLikelyUI = (el: HTMLElement): boolean => {
  // 1. Cheap, precise class-token match (O(1)). Token-based so 'article-header'
  //    is NOT treated as UI, while 'sidebar'/'navbar' still are.
  if (hasUiClass(el)) return true

  // 2. Structural/content wrappers (have block-level descendants) are never UI by
  //    themselves \u2014 descend and judge their leaf blocks. Avoids O(n^2) subtree scans.
  if (el.querySelector(BLOCK_SELECTOR)) return false

  const trimmedText = (el.textContent || '').trim()
  if (!trimmedText) return false
  const totalLen = trimmedText.length

  let linkTextLen = 0
  el.querySelectorAll('a').forEach(a => { linkTextLen += (a.textContent?.trim().length || 0) })
  const linkDensity = totalLen > 0 ? linkTextLen / totalLen : 0
  const hasPunctuation = /[.,!?;\uff0c\u3002\uff1f\uff01\uff1b]/.test(trimmedText)

  // High-Confidence Prose: long enough, punctuated, not link-dominated.
  if (totalLen > 40 && hasPunctuation && linkDensity < 0.4) return false

  // Content landmarks are never pruned by link density (avoids dropping real content).
  if (el.closest('main, article, [role="main"], [role="article"]')) return false

  // Link-dominated, unpunctuated terminal lists are UI.
  if (linkDensity > 0.4 && !hasPunctuation && totalLen < 2000) return true
  if (totalLen < 40 && linkDensity > 0.7) return true

  return false
}

/**
 * Heading tags are usually ignored to preserve layout, but we allow them if they are deep inside content.
 */
const HEADER_SELECTOR = 'H1, H2, H3, H4, H5, H6, [role="heading"]'

interface WordState {
  totalDisplayed: number
  lastBlockIndex: number
}

/**
 * Creates an optimized TreeWalker that prunes ignored subtrees.
 */
const createOptimizedWalker = (root: HTMLElement | Document, extraReject?: (el: HTMLElement) => boolean) => {
  return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        // 1. Hard skip for non-content UI
        if (el.matches(SKIP_SELECTOR) || el.isContentEditable || (extraReject && extraReject(el))) {
          return NodeFilter.FILTER_REJECT
        }
        
        // 2. Heuristic check for UI containers
        if (isLikelyUI(el)) {
          return NodeFilter.FILTER_REJECT
        }

        // 3. Skip headings to preserve layout/structure
        if (el.matches(HEADER_SELECTOR)) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_SKIP
      }
      return NodeFilter.FILTER_ACCEPT
    }
  })
}

/**
 * Main entry point for scanning and highlighting
 */
export const scanAndHighlight = async (
  root: HTMLElement | Document,
  level: ProficiencyLevel,
  vocabulary: Set<string> = new Set(),
  userDict: Record<string, WordExplanation> = {},
  pronunciation: 'UK' | 'US' = 'US',
  dbLookup?: (words: string[]) => Promise<Record<string, WordExplanation>>,
  shouldClear: boolean = false,
  showIPA: boolean = true,
  backfill?: BackfillFn,
  knownWords: Set<string> = new Set()
) => {
  if (shouldClear) clearHighlights(root)

  // 1. Collect all candidates for batch lookup. Track which surface forms were
  //    ever seen lowercase (proper-noun filter) and a sample sentence per word.
  const candidates: Set<string> = new Set()
  const everLower: Set<string> = new Set()
  const contextMap = new Map<string, string>()
  const candidateWalker = createOptimizedWalker(root)

  while (candidateWalker.nextNode()) {
    const text = candidateWalker.currentNode.nodeValue || ''
    for (const tok of extractCandidates(text)) {
      const lower = tok.toLowerCase()
      candidates.add(lower)
      if (/^[a-z]/.test(tok)) everLower.add(lower)
      if (!contextMap.has(lower)) contextMap.set(lower, text.trim().slice(0, 200))
    }
  }

  // 2. Batch fetch dictionary data. Look up ALL candidates (not just those absent
  //    from userDict) so the core dictionary overrides any stale saved-word
  //    snapshot in userDict; saved words not in the core dict keep their snapshot.
  let combinedDict = { ...userDict }
  if (dbLookup && candidates.size > 0) {
    const dbResults = await dbLookup(Array.from(candidates)).catch(() => ({}))
    combinedDict = { ...combinedDict, ...dbResults }
  }

  // 3. Phase 1 — local annotation (immediate, unchanged behavior)
  annotateBlocks(root, level, vocabulary, combinedDict, pronunciation, showIPA, knownWords)

  // 4. Phase 2 — opt-in online backfill of locally-uncovered words. Skipped
  //    entirely when no backfill fn is injected (AI off / offline) → local-only.
  if (!backfill) return
  await runBackfill(root, level, pronunciation, showIPA, combinedDict, candidates, everLower, contextMap, backfill, knownWords)
}

/**
 * Build blocks from the current DOM and annotate each text node. Used for both
 * the Phase-1 local pass and the Phase-2 backfill pass (with a backfill-only dict).
 */
// Groups the annotatable text nodes under `root` by their nearest block element,
// skipping subtrees inside existing `.ll-word-container` annotations.
const buildBlocks = (root: HTMLElement | Document): { blocks: Element[]; blockMap: Map<Element, Text[]> } => {
  const walker = createOptimizedWalker(root, (el) => el.classList.contains('ll-word-container'))
  const blockMap = new Map<Element, Text[]>()
  const blocks: Element[] = []

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const block = node.parentElement?.closest('p, li') ||
                  node.parentElement?.closest('div, section, article') ||
                  node.parentElement
    if (block) {
      if (!blockMap.has(block)) {
        blockMap.set(block, [])
        blocks.push(block)
      }
      blockMap.get(block)?.push(node)
    }
  }
  return { blocks, blockMap }
}

const annotateBlocks = (
  root: HTMLElement | Document,
  level: ProficiencyLevel,
  vocabulary: Set<string>,
  dict: Record<string, WordExplanation>,
  pronunciation: 'UK' | 'US',
  showIPA: boolean,
  knownWords: Set<string> = new Set()
) => {
  const { blocks, blockMap } = buildBlocks(root)
  const wordStateMap = new Map<string, WordState>()

  blocks.forEach((block, blockIndex) => {
    const seenInBlock = new Set<string>()
    blockMap.get(block)?.forEach(node => {
      processTextNode(node, level, vocabulary, dict, pronunciation, showIPA, wordStateMap, blockIndex, seenInBlock, knownWords)
    })
  })
}

/**
 * Phase 2 orchestration: pick locally-uncovered "hard" words, serve from the AI
 * cache where possible, batch-fetch the rest, persist them, then re-annotate the
 * DOM with a backfill-only dict so just those words gain annotations (fade-in).
 * Any failure degrades silently to the Phase-1 result.
 */
const runBackfill = async (
  root: HTMLElement | Document,
  level: ProficiencyLevel,
  pronunciation: 'UK' | 'US',
  showIPA: boolean,
  combinedDict: Record<string, WordExplanation>,
  candidates: Set<string>,
  everLower: Set<string>,
  contextMap: Map<string, string>,
  backfill: BackfillFn,
  knownWords: Set<string> = new Set()
) => {
  // Resolved locally if it is in the merged dict or the confusion map (incl. lemma).
  const isResolved = (w: string) => !!combinedDict[w] || getLemmaKeys(w).some(k => !!confusionMap[k])
  // Don't backfill words the user already marked as known.
  const pool = Array.from(candidates).filter(w => !knownWords.has(w))
  const unknownHard = selectUnknownHard(pool, { isResolved, everLower })
  if (unknownHard.length === 0) return

  const targets = unknownHard.slice(0, MAX_BACKFILL)
  if (unknownHard.length > MAX_BACKFILL) {
    console.log(`In Reading: backfill capped at ${MAX_BACKFILL}, dropped ${unknownHard.length - MAX_BACKFILL} word(s)`)
  }

  // Serve from cache first; only miss words hit the network.
  const cached = await getAiCache(targets).catch(() => ({} as Record<string, AiCacheEntry>))
  const misses = targets.filter(w => !cached[w])

  const fetched: Record<string, BackfillGloss> = {}
  if (misses.length > 0) {
    const chunks: string[][] = []
    for (let i = 0; i < misses.length; i += BACKFILL_BATCH) chunks.push(misses.slice(i, i + BACKFILL_BATCH))
    const batchResults = await Promise.all(
      chunks.slice(0, BACKFILL_CONCURRENCY).map(chunk =>
        backfill(chunk.map(w => ({ word: w, sentence: contextMap.get(w) || w }))).catch(() => ({} as Record<string, BackfillGloss>))
      )
    )
    for (const r of batchResults) Object.assign(fetched, r)
    const toCache: AiCacheEntry[] = Object.entries(fetched).map(([word, g]) => ({
      word, meaning: g.meaning, ipa_us: g.ipa_us, ipa_uk: g.ipa_uk, source: 'AI'
    }))
    if (toCache.length > 0) await putAiCache(toCache).catch(() => {})
  }

  // Merge cache hits + fresh fetches into a backfill-only dictionary.
  const backfillDict: Record<string, WordExplanation> = {}
  const addGloss = (word: string, g: BackfillGloss, source: string) => {
    backfillDict[word] = { word, meaning: g.meaning, ipa_us: g.ipa_us, ipa_uk: g.ipa_uk, source } as WordExplanation
  }
  for (const [w, g] of Object.entries(cached)) addGloss(w, g, g.source || 'AI')
  for (const [w, g] of Object.entries(fetched)) addGloss(w, g, 'AI')
  if (Object.keys(backfillDict).length === 0) return

  // Re-annotate: backfill-only dict + empty vocabulary so existing local/saved
  // annotations are untouched and only the newly-resolved words get added.
  annotateBlocks(root, level, new Set<string>(), backfillDict, pronunciation, showIPA, knownWords)
}

/**
 * Process a single text node with Spaced Reinforcement
 */
const processTextNode = (
  node: Text, 
  level: ProficiencyLevel, 
  vocabulary: Set<string>,
  dict: Record<string, WordExplanation>,
  pronunciation: 'UK' | 'US',
  showIPA: boolean,
  stateMap: Map<string, WordState>,
  blockIndex: number,
  seenInBlock: Set<string>,
  knownWords: Set<string> = new Set(),
  confusionMap?: Record<string, any>
) => {
  const text = node.nodeValue
  if (!text?.trim()) return

  const matches = analyzeText(text, level, vocabulary, dict, pronunciation, confusionMap, knownWords)
  if (matches.length === 0) return

  const fragment = document.createDocumentFragment()
  let lastIndex = 0

  matches.forEach(match => {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    const word = match.word
    const lowerWord = word.toLowerCase()
    const state = stateMap.get(lowerWord) || { totalDisplayed: 0, lastBlockIndex: -1 }
    
    const isFirstInBlock = !seenInBlock.has(lowerWord)
    const hasMetGap = state.lastBlockIndex === -1 || (blockIndex - state.lastBlockIndex >= REFRESH_GAP)
    
    if (isFirstInBlock && hasMetGap) {
      state.totalDisplayed++
      state.lastBlockIndex = blockIndex
      stateMap.set(lowerWord, state)
      fragment.appendChild(createWordContainer(match, pronunciation, showIPA))
    } else {
      fragment.appendChild(document.createTextNode(word))
    }

    seenInBlock.add(lowerWord)
    lastIndex = match.index + match.length
  })

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }
  node.replaceWith(fragment)
}

/**
 * Creates the interactive translation UI element
 */
const createWordContainer = (match: any, pronunciation: string, showIPA: boolean): HTMLElement => {
  const container = document.createElement('span')
  container.className = 'll-word-container'
  container.setAttribute('data-word', match.word.toLowerCase())
  container.setAttribute('contenteditable', 'false')
  
  const exp = match.explanation
  const shouldHideIPA = exp.hideIPA

  // Base Styles
  Object.assign(container.style, {
    backgroundColor: 'rgba(75, 139, 245, 0)',
    borderRadius: '3px',
    padding: '1px 2px',
    margin: '0 1px',
    display: 'inline',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    borderBottom: '1px solid transparent'
  })

  // Fade-in animation
  setTimeout(() => {
    container.style.backgroundColor = 'rgba(75, 139, 245, 0.15)'
    container.style.borderBottom = '1px solid rgba(75, 139, 245, 0.3)'
  }, 10)

  // Word Span
  const span = document.createElement('span')
  span.className = 'll-word'
  span.textContent = match.word
  span.style.fontWeight = 'bold'
  span.style.color = 'inherit'
  span.onclick = (e) => e.stopPropagation()
  container.appendChild(span)

  // Voice Icon (Refined Two-Arc Style)
  if (!shouldHideIPA) {
    const voiceBtn = document.createElement('span')
    voiceBtn.className = 'll-voice-btn'
    voiceBtn.setAttribute('aria-hidden', 'true')
    voiceBtn.style.cssText = 'user-select:none; margin-left:4px; display:inline-flex; align-items:center; cursor:pointer; padding:2px; vertical-align:middle;'
    
    voiceBtn.innerHTML = `
      <svg class="youdao-voice-svg" viewBox="0 0 1024 1024" width="14" height="14">
        <rect class="source" x="256" y="384" width="64" height="256" rx="32" fill="currentColor" opacity="0.6" />
        <path class="wave wave-1" d="M448 320c48 0 96 85.3 96 192s-48 192-96 192" stroke="currentColor" stroke-width="80" fill="none" stroke-linecap="round" opacity="0.6" />
        <path class="wave wave-2" d="M608 192c80 0 160 143.3 160 320s-80 320-160 320" stroke="currentColor" stroke-width="80" fill="none" stroke-linecap="round" opacity="0.6" />
      </svg>
      <style>
        @keyframes voiceWaveFade {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .ll-voice-btn:hover .source { fill: #4b8bf5; opacity: 1; }
        .ll-voice-btn:hover .wave { stroke: #4b8bf5; opacity: 1; }
        .ll-voice-btn.playing .source { fill: #4b8bf5; opacity: 1; }
        .ll-voice-btn.playing .wave { stroke: #4b8bf5; opacity: 1; }
        .ll-voice-btn.playing .wave-1 { animation: voiceWaveFade 0.6s infinite; }
        .ll-voice-btn.playing .wave-2 { animation: voiceWaveFade 0.6s infinite 0.2s; }
      </style>
    `
    
    voiceBtn.onclick = (e) => {
      e.stopPropagation()
      voiceBtn.classList.add('playing')
      speak(match.word, pronunciation === 'UK' ? 'en-GB' : 'en-US')
      setTimeout(() => voiceBtn.classList.remove('playing'), 1200)
    }
    container.appendChild(voiceBtn)
  }

  // Translation Span
  const translation = document.createElement('span')
  translation.className = 'll-translation'
  translation.setAttribute('aria-hidden', 'true')
  translation.style.userSelect = 'none'
  
  const ipaPart = (!shouldHideIPA && showIPA && exp.ipa) ? `${exp.ipa}` : ''
  const separator = ipaPart ? ' · ' : ''
  
  // Abbreviate POS for inline display (e.g. noun -> n.)
  const POS_MAP: Record<string, string> = {
    'noun': 'n.',
    'verb': 'v.',
    'adjective': 'adj.',
    'adverb': 'adv.',
    'preposition': 'prep.',
    'pronoun': 'pron.',
    'conjunction': 'conj.',
    'determiner': 'det.',
    'exclamation': 'excl.',
    'number': 'num.',
    'particle': 'part.'
  };
  
  let displayMeaning = exp.meaning || '';
  Object.entries(POS_MAP).forEach(([full, abbr]) => {
    displayMeaning = displayMeaning.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr);
  });

  translation.textContent = ` (${ipaPart}${separator}${displayMeaning})`
  Object.assign(translation.style, {
    color: 'inherit',
    fontSize: '0.8em',
    marginLeft: '4px',
    fontWeight: 'normal',
    opacity: '0.7',
    whiteSpace: 'nowrap'
  })
  
  container.appendChild(translation)
  return container
}

/**
 * Utility: Clear highlights
 */
export const clearHighlights = (root: HTMLElement | Document = document) => {
  const highlights = root.querySelectorAll('.ll-word-container')
  const parents = new Set<ParentNode>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parents.add(parent as ParentNode)
    }
  })
  parents.forEach(p => p.normalize())
}

// Core of the targeted single-word passes: walk blocks and annotate only occurrences
// resolvable from `dict`/`confusionMap`, seeding the gap from blocks that already show
// the word so it is never densified. Difficulty is gated by analyzeText (unless the
// word is forced via `vocab`).
const annotateSingle = (
  root: HTMLElement | Document,
  lower: string,
  level: ProficiencyLevel,
  vocab: Set<string>,
  dict: Record<string, WordExplanation>,
  confusionMap: Record<string, any>,
  pronunciation: 'UK' | 'US',
  showIPA: boolean
) => {
  const { blocks, blockMap } = buildBlocks(root)
  const wordStateMap = new Map<string, WordState>()

  blocks.forEach((block, blockIndex) => {
    // A block already showing this word seeds the gap and gets no new annotation,
    // so an already-annotated word is not densified.
    const alreadyHere = Array.from(block.querySelectorAll('.ll-word-container'))
      .some(c => c.getAttribute('data-word') === lower)
    if (alreadyHere) {
      wordStateMap.set(lower, { totalDisplayed: 0, lastBlockIndex: blockIndex })
      return
    }
    const seenInBlock = new Set<string>()
    blockMap.get(block)?.forEach(node =>
      processTextNode(node, level, vocab, dict, pronunciation, showIPA, wordStateMap, blockIndex, seenInBlock, new Set(), confusionMap)
    )
  })
}

/**
 * Targeted annotation of a single (newly-saved) word without disturbing other
 * words' spacing. A one-word dict + empty confusion map means ONLY this word can
 * match (no collateral re-annotation of other difficult/confusion-map words), and
 * it is force-annotated (via `vocab`). Used by the vocabulary-add surgical update
 * instead of a full non-clearing rescan (which would re-annotate gap-skipped
 * occurrences of other words).
 */
export const annotateWord = (
  root: HTMLElement | Document,
  word: string,
  exp: WordExplanation,
  level: ProficiencyLevel,
  pronunciation: 'UK' | 'US' = 'US',
  showIPA: boolean = true
) => {
  const lower = word.toLowerCase()
  annotateSingle(root, lower, level, new Set([lower]), { [lower]: exp }, {}, pronunciation, showIPA)
}

/**
 * Targeted re-annotation after a word is un-marked as known: resolve its real
 * dictionary entry (confusion-map first, else IndexedDB) and annotate it
 * difficulty-gated & spaced — WITHOUT clearing/rescanning the whole page (avoids the
 * flicker of a full runScan). No `vocab` force: only annotated where hard enough.
 */
export const reannotateWord = async (
  root: HTMLElement | Document,
  word: string,
  level: ProficiencyLevel,
  pronunciation: 'UK' | 'US',
  showIPA: boolean,
  dbLookup?: (words: string[]) => Promise<Record<string, WordExplanation>>
) => {
  const lower = word.toLowerCase()
  // Dictionary A (confusion-map), lemma-aware — fed via the same channel so
  // heteronyms/multi-entry words render identically to a normal scan.
  const cmKey = [lower, ...getLemmaKeys(lower)].find(k => !!confusionMap[k])
  if (cmKey) {
    annotateSingle(root, lower, level, new Set(), {}, { [cmKey]: confusionMap[cmKey] }, pronunciation, showIPA)
    return
  }
  // Dictionary B (IndexedDB).
  if (!dbLookup) return
  const res = await dbLookup([lower]).catch(() => ({} as Record<string, WordExplanation>))
  if (Object.keys(res).length > 0) {
    annotateSingle(root, lower, level, new Set(), res, {}, pronunciation, showIPA)
  }
}

/**
 * Utility: Unhighlight specific word
 */
export const unhighlightWord = (word: string, root: HTMLElement | Document = document) => {
  const highlights = root.querySelectorAll(`.ll-word-container[data-word="${word.toLowerCase()}"]`)
  const parents = new Set<ParentNode>()

  highlights.forEach(el => {
    const wordSpan = el.querySelector('.ll-word')
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(wordSpan?.textContent || ''), el)
      parents.add(parent as ParentNode)
    }
  })
  parents.forEach(p => p.normalize())
}

/**
 * Helper: Create standard TreeWalker
 */
const createWalker = (root: HTMLElement | Document, rejectFn: (node: Node) => boolean) => {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => rejectFn(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  })
}
