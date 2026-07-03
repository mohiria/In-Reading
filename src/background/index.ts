import { fetchFromLLM, translateTextLLM, fetchBatchFromLLM, BatchItem, BatchGloss } from './llm'
import { UserSettings } from '../common/types'
import { getSettings } from '../common/storage/settings'
import { resetDictionaryCache } from '../common/storage/indexed-db'
import { startupReconcile, handleSyncChange } from '../common/storage/syncReconcile'
import * as TranslationService from './services/translation'

// Cross-device sync of vocabulary / known-words: reconcile once at worker start,
// and apply per-word sync deltas into chrome.storage.local (the shared read source).
startupReconcile().catch(err => console.error('Sync startup reconcile failed', err))
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') handleSyncChange(changes).catch(() => {})
})

/**
 * State Management (Persist across refreshes using session storage)
 */
const getTabState = async (tabId: number): Promise<boolean> => {
  const data = await chrome.storage.session.get(`tabState_${tabId}`)
  return !!data[`tabState_${tabId}`]
}

const setTabState = async (tabId: number, enabled: boolean) => {
  await chrome.storage.session.set({ [`tabState_${tabId}`]: enabled })
}

/**
 * Badge & Icon Management
 */
const updateTabUI = (tabId: number, enabled: boolean) => {
  chrome.action.setBadgeText({ tabId, text: '' })
  
  const iconPrefix = enabled ? 'icon-active' : 'icon'
  const iconPath = (size: string) => `/src/assets/${iconPrefix}-${size}.png`
  const fallbackPath = (size: string) => `assets/${iconPrefix}-${size}.png`

  const setIcon = (pathMap: Record<string, string>) => chrome.action.setIcon({ tabId, path: pathMap })

  setIcon({ "16": iconPath('16'), "48": iconPath('48'), "128": iconPath('128') }).catch(() => {
    setIcon({ "16": fallbackPath('16'), "48": fallbackPath('48'), "128": fallbackPath('128') })
  })
}

const toggleTabState = async (tabId: number) => {
  const currentState = await getTabState(tabId)
  const newState = !currentState
  await setTabState(tabId, newState)
  updateTabUI(tabId, newState)
  
  chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_TAB_ENABLED', enabled: newState }).catch(() => {})
  chrome.runtime.sendMessage({ type: 'TAB_STATE_CHANGED', tabId, enabled: newState }).catch(() => {})
}

/**
 * Translation Orchestration
 */
async function handleTranslationRequest(text: string, contextSentence: string, settings?: UserSettings) {
  const preferredPron = settings?.pronunciation || 'US'
  
  const isSingleWord = text.trim().split(/\s+/).length === 1

  // 1. LLM Priority — a single word gets an IPA + meaning explanation; a phrase or
  // sentence gets a complete translation (not a one-word "explanation" that drops clauses).
  if (settings?.engine === 'llm' && settings.llm.apiKey) {
    try {
      return isSingleWord
        ? await fetchFromLLM(text, contextSentence || text, settings)
        : await translateTextLLM(text, settings)
    } catch (e) {
      console.error('LLM translation failed, falling back to dictionary', e)
    }
  }

  // 2. Dictionary Lookup (for single words)
  if (isSingleWord) {
    const youdao = await TranslationService.fetchFromYoudao(text, preferredPron)
    if (youdao) return { ...youdao, source: 'Youdao' }

    const iciba = await TranslationService.fetchFromIciba(text)
    if (iciba) return { ...iciba, source: 'iCIBA' }
  }

  // 3. Machine Translation Fallbacks
  try {
    return await TranslationService.fetchFromYoudaoMT(text)
  } catch {
    try {
      return await TranslationService.fetchFromIcibaMT(text)
    } catch {
      return await TranslationService.fetchFromGoogle(text)
    }
  }
}

/**
 * Inline AI backfill: explain a batch of locally-uncovered words in one request.
 * Returns an empty map on any failure (offline, bad key, parse error) so the
 * content script degrades silently to local-only annotation.
 */
async function handleBackfillRequest(
  items: BatchItem[],
  settings?: UserSettings
): Promise<Record<string, BatchGloss>> {
  if (!settings || settings.engine !== 'llm' || !settings.llm.apiKey) return {}
  if (!Array.isArray(items) || items.length === 0) return {}
  try {
    return await fetchBatchFromLLM(items, settings)
  } catch (e) {
    console.error('Backfill request failed', e)
    return {}
  }
}

/**
 * Event Listeners
 */
// On install/update (including reloading the unpacked extension), reset the
// dictionary version so the next page scan re-imports the latest bundled
// dictionary — even when the bundled version number is unchanged. Saved
// vocabulary (user_words / chrome.storage) is left untouched.
chrome.runtime.onInstalled.addListener(() => {
  resetDictionaryCache().catch(err => console.error('Dictionary cache reset on install failed', err))
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translation') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) toggleTabState(tab.id)
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId || sender.tab?.id

  switch (request.type) {
    case 'GET_TAB_STATE':
      if (tabId) {
        getTabState(tabId).then(enabled => sendResponse({ enabled }))
        return true
      }
      break
    case 'TOGGLE_TAB_STATE':
      if (tabId) toggleTabState(tabId).then(() => sendResponse({ success: true }))
      break
    case 'TRANSLATE_WORD':
      handleTranslationRequest(request.text, request.context, request.settings)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }))
      return true
    case 'BACKFILL_WORDS':
      handleBackfillRequest(request.items, request.settings)
        .then(data => sendResponse({ success: true, data }))
        .catch(() => sendResponse({ success: true, data: {} }))
      return true
  }
  return true
})

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove(`tabState_${tabId}`))
chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  if (change.status === 'complete') {
    const enabled = await getTabState(tabId)
    if (enabled) {
      updateTabUI(tabId, true)
      // Ensure the newly loaded content script knows it should be enabled
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_TAB_ENABLED', enabled: true }).catch(() => {})
    }
  }
})
