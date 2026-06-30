import React from 'react'
import ReactDOM from 'react-dom/client'
import { scanAndHighlight, clearHighlights, unhighlightWord } from './engine/scanner'
import { getSettings } from '../common/storage/settings'
import { getVocabulary } from '../common/storage/vocabulary'
import { getKnownWords } from '../common/storage/knownWords'
import { initDictionaryService } from '../common/storage/dictionary-service'
import { batchLookupWords } from '../common/storage/indexed-db'
import { Overlay } from './components/Overlay'
import { SelectionPopup } from './components/SelectionPopup'

/**
 * Shadow DOM Setup for UI Isolation
 */
const host = document.createElement('div')
host.id = 'll-extension-host'
Object.assign(host.style, { position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 2147483647, pointerEvents: 'none' })
document.body.appendChild(host)

const root = ReactDOM.createRoot(host.attachShadow({ mode: 'open' }))
root.render(<><Overlay /><SelectionPopup /></>)

/**
 * State & Scanning Logic
 */
let tabEnabled = false
let isScanning = false

const runScan = async (forceClear = false) => {
  if (isScanning || !tabEnabled) {
    if (!tabEnabled) clearHighlights()
    return
  }
  isScanning = true

  try {
    const [settings, vocabList, knownList] = await Promise.all([getSettings(), getVocabulary(), getKnownWords()])
    const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
    const vocabMap = Object.fromEntries(vocabList.map(v => [v.word.toLowerCase(), v]))
    const knownSet = new Set(knownList.map(w => w.toLowerCase()))

    // Opt-in online backfill: only when AI is configured and the device is online.
    const shouldBackfill = settings.engine === 'llm' && !!settings.llm?.apiKey && navigator.onLine
    const backfillFn = shouldBackfill
      ? async (items: { word: string; sentence: string }[]) => {
          const res = await chrome.runtime.sendMessage({ type: 'BACKFILL_WORDS', items, settings }).catch(() => null)
          return res && res.success && res.data ? res.data : {}
        }
      : undefined

    await scanAndHighlight(
      document.body, settings.proficiency, vocabSet, vocabMap,
      settings.pronunciation, batchLookupWords, forceClear, settings.showIPA, backfillFn, knownSet
    )
  } finally {
    isScanning = false
  }
}

/**
 * Mutation Observer for Dynamic Content
 */
const setupObserver = () => {
  let timeout: any = null
  const observer = new MutationObserver((mutations) => {
    // Check if the change was made by us (adding/removing word containers)
    const isOurMutation = mutations.some(m => {
      const isOurNode = (n: Node) => 
        (n instanceof HTMLElement && (n.classList.contains('ll-word-container') || n.id === 'll-extension-host')) || 
        n.parentElement?.classList.contains('ll-word-container')
      
      return Array.from(m.addedNodes).some(isOurNode) || Array.from(m.removedNodes).some(isOurNode)
    })

    if (isOurMutation) return
    
    if (timeout) clearTimeout(timeout)
    // Reduced debounce time from 1000ms to 500ms for better responsiveness
    timeout = setTimeout(() => {
      if (tabEnabled) runScan(false)
    }, 500)
  })
  
  observer.observe(document.body, { childList: true, subtree: true })
}

/**
 * Initialization & Navigation Handling
 */
const init = async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' })
    tabEnabled = !!res?.enabled
  } catch {
    tabEnabled = false
  }

  await initDictionaryService()
  if (tabEnabled) {
    await runScan(true)
  }
  setupObserver()
  setupNavigationListener()
}

/**
 * Handle SPA Navigations (URL changes without full reload)
 */
const setupNavigationListener = () => {
  let lastUrl = location.href
  
  const checkUrl = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      if (tabEnabled) {
        console.log('In Reading: Navigation detected, re-scanning...')
        runScan(true)
      }
    }
  }

  window.addEventListener('popstate', checkUrl)
  
  // Intercept programmatic navigation (common in SPAs like BBC, YouTube, etc.)
  const originalPushState = history.pushState
  history.pushState = function(...args) {
    originalPushState.apply(this, args)
    setTimeout(checkUrl, 100)
  }
  
  const originalReplaceState = history.replaceState
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args)
    setTimeout(checkUrl, 100)
  }
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.type === 'TOGGLE_TAB_ENABLED') {
    tabEnabled = req.enabled
    tabEnabled ? runScan(true) : clearHighlights()
  }
})

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.settings) {
    const { oldValue: oldS, newValue: newS } = changes.settings
    const needsRescan = !oldS || !newS || oldS.proficiency !== newS.proficiency || 
                        oldS.pronunciation !== newS.pronunciation || oldS.showIPA !== newS.showIPA
    if (needsRescan && tabEnabled) runScan(true)
  } else if (area === 'local' && changes.vocabulary && tabEnabled) {
    const oldVocab = (changes.vocabulary.oldValue || []) as any[]
    const newVocab = (changes.vocabulary.newValue || []) as any[]
    
    // Surgical update: only handle words that were added or removed
    if (newVocab.length > oldVocab.length) {
      // Added words
      const added = newVocab.filter(nv => !oldVocab.some(ov => ov.word === nv.word))
      for (const item of added) {
        const [settings] = await Promise.all([getSettings()])
        const vocabSet = new Set(newVocab.map(v => v.word.toLowerCase()))
        const vocabMap = Object.fromEntries(newVocab.map(v => [v.word.toLowerCase(), v]))
        // Scan specifically for the new word
        await scanAndHighlight(
          document.body, settings.proficiency, vocabSet, vocabMap, 
          settings.pronunciation, batchLookupWords, false, settings.showIPA
        )
      }
    } else if (newVocab.length < oldVocab.length) {
      // Removed words
      const removed = oldVocab.filter(ov => !newVocab.some(nv => nv.word === ov.word))
      removed.forEach(item => unhighlightWord(item.word, document.body))
    }
  } else if (area === 'local' && changes.knownWords && tabEnabled) {
    // Known-words is the inverse of vocabulary: a newly-known word should lose its
    // annotation immediately; an un-marked word should become annotatable again.
    const oldKnown = (changes.knownWords.oldValue || []) as string[]
    const newKnown = (changes.knownWords.newValue || []) as string[]
    const added = newKnown.filter(w => !oldKnown.includes(w))
    if (added.length > 0) {
      added.forEach(w => unhighlightWord(w, document.body))
    } else {
      // A word was un-marked (or the list otherwise shrank) → re-scan to restore it.
      runScan(true)
    }
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
