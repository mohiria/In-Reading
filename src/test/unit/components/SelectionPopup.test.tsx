/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SelectionPopup } from '../../../content/components/SelectionPopup'

// Mock global chrome
const chromeMock = {
  runtime: {
    id: 'test-extension-id', // present → extension context is "alive" (context-invalidation guard)
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
  },
  storage: {
    sync: { get: vi.fn(), set: vi.fn() },
    local: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
  }
}
vi.stubGlobal('chrome', chromeMock)

// Mock confusion-map.json with NEW standardized structure
vi.mock('../../../../public/dictionaries/confusion-map.json', () => ({
  default: {
    'tear': {
      word: 'tear',
      cefr: ['a2', 'b1'], // Standardized field
      entries: [
        { type: 'noun', cefr: 'a2', phon_br: '/tɪə(r)/', phon_n_am: '/tɪr/', translation: '眼泪' },
        { type: 'verb', cefr: 'b1', phon_br: '/teə(r)/', phon_n_am: '/ter/', translation: '撕裂' }
      ],
      source: 'core-confusion'
    }
  }
}))

// Mock hooks
const mockSettings = {
  pronunciation: 'US',
  proficiency: 'CEFR_A1',
  showIPA: true,
  engine: 'llm',
  llm: { provider: 'gemini', apiKey: 'k', baseUrl: '', model: '' }
}

vi.mock('../../../common/hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, loading: false })
}))

vi.mock('../../../common/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ vocabulary: [], addWord: vi.fn(), removeWord: vi.fn() })
}))

const { mockAddKnown } = vi.hoisted(() => ({ mockAddKnown: vi.fn() }))
vi.mock('../../../common/hooks/useKnownWords', () => ({
  useKnownWords: () => ({ knownWords: [], addKnown: mockAddKnown, removeKnown: vi.fn(), loading: false })
}))

vi.mock('../../../common/storage/indexed-db', () => ({
  lookupWordInDB: vi.fn().mockResolvedValue(null),
  batchLookupWords: vi.fn().mockResolvedValue({}),
  getAiCache: vi.fn().mockResolvedValue({}),
  putAiCache: vi.fn().mockResolvedValue(undefined)
}))

import { getAiCache, putAiCache } from '../../../common/storage/indexed-db'

describe('SelectionPopup Standardization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.type === 'GET_TAB_STATE') callback({ enabled: true })
    })
    
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'tear',
      isCollapsed: false,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 })
      })
    })
  })

  it('should render full POS names from dictionary without local mapping', async () => {
    await act(async () => {
      render(<SelectionPopup />)
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    // Should find full names directly
    expect(await screen.findByText('noun')).toBeDefined()
    expect(await screen.findByText('verb')).toBeDefined()
  })

  it('C1: an ai_cache hit renders instantly without a TRANSLATE_WORD network request', async () => {
    // A word not in the confusion map and not in the core dict, but present in ai_cache.
    ;(getAiCache as any).mockResolvedValue({
      serendipity: { word: 'serendipity', meaning: '机缘巧合', ipa_us: '/ˌserənˈdɪpəti/', source: 'AI' }
    })
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'serendipity',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    })

    await act(async () => { render(<SelectionPopup />) })
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    // Meaning shown from the local cache...
    expect(await screen.findByText('机缘巧合')).toBeDefined()
    // ...and no network translation request was issued.
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRANSLATE_WORD' }),
      expect.anything()
    )
  })

  it('K5: clicking "mark as known" calls addKnown with the selected word', async () => {
    // default selection is 'tear' (confusion-map hit → popup renders with buttons)
    await act(async () => { render(<SelectionPopup />) })
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    const btn = await screen.findByText(/已掌握/)
    await act(async () => { btn.click() })
    expect(mockAddKnown).toHaveBeenCalledWith('tear')
  })

  it('T1: a full-sentence selection is translated (>50 chars) and shows no save buttons', async () => {
    const sentence = 'The quick brown fox jumps over the lazy dog again and again today.' // >50, <=500
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => sentence,
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    })
    chromeMock.runtime.sendMessage.mockImplementation((msg: any, callback: any) => {
      if (msg.type === 'GET_TAB_STATE') callback({ enabled: true })
      if (msg.type === 'TRANSLATE_WORD') callback({ success: true, data: { word: sentence, meaning: '敏捷的棕色狐狸一次次跃过懒狗。', source: 'AI (GPT)' } })
    })

    await act(async () => { render(<SelectionPopup />) })
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })

    expect(await screen.findByText('敏捷的棕色狐狸一次次跃过懒狗。')).toBeDefined()
    // Multi-word selection → no vocabulary/known save buttons.
    expect(screen.queryByText(/生词本/)).toBeNull()
    expect(screen.queryByText(/已掌握/)).toBeNull()
  })

  // --- Request lifecycle (race): superseded requests must not win ---
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const mockSel = (text: string, collapsed = false) => {
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => text,
      isCollapsed: collapsed,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    }) as any
  }

  it('R1: a late response from a superseded selection does not overwrite the current one', async () => {
    ;(getAiCache as any).mockResolvedValue({})
    const calls: { text: string; cb: (r: any) => void }[] = []
    chromeMock.runtime.sendMessage.mockImplementation((msg: any, cb: any) => {
      if (msg.type === 'GET_TAB_STATE') { cb({ enabled: true }); return }
      if (msg.type === 'TRANSLATE_WORD') calls.push({ text: msg.text, cb })
    })

    await act(async () => { render(<SelectionPopup />) })
    // Select "alpha" (request A dispatched, not yet answered)
    mockSel('alpha')
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); await sleep(25) })
    // Re-select "bravo" before A answers (request B dispatched)
    mockSel('bravo')
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); await sleep(25) })

    expect(calls.map(c => c.text)).toEqual(['alpha', 'bravo'])
    // B answers first, then the stale A answers LAST
    await act(async () => {
      calls.find(c => c.text === 'bravo')!.cb({ success: true, data: { word: 'bravo', meaning: '乙译文', source: 'AI (GPT)' } })
      calls.find(c => c.text === 'alpha')!.cb({ success: true, data: { word: 'alpha', meaning: '甲译文', source: 'AI (GPT)' } })
    })

    expect(screen.queryByText('乙译文')).toBeTruthy()   // current selection's result
    expect(screen.queryByText('甲译文')).toBeNull()      // stale result must not appear
  })

  it('R2: a response arriving after the popup is closed does not reopen it', async () => {
    ;(getAiCache as any).mockResolvedValue({})
    const calls: { text: string; cb: (r: any) => void }[] = []
    chromeMock.runtime.sendMessage.mockImplementation((msg: any, cb: any) => {
      if (msg.type === 'GET_TAB_STATE') { cb({ enabled: true }); return }
      if (msg.type === 'TRANSLATE_WORD') calls.push({ text: msg.text, cb })
    })

    await act(async () => { render(<SelectionPopup />) })
    mockSel('alpha')
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); await sleep(25) })
    // Close the popup: click blank → selection collapses
    mockSel('', true)
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); await sleep(25) })
    // The stale request finally answers
    await act(async () => {
      calls.find(c => c.text === 'alpha')?.cb({ success: true, data: { word: 'alpha', meaning: '甲译文', source: 'AI (GPT)' } })
    })

    expect(screen.queryByText('甲译文')).toBeNull()        // popup did not reopen
    expect(screen.queryByText('Translating...')).toBeNull() // no leftover loading popup
  })

  it('P1-badge: a legacy bare-"AI" cached source shows the current provider on selection', async () => {
    // ai_cache entries written before provider labeling carry source: 'AI'.
    ;(getAiCache as any).mockResolvedValue({
      legacyword: { word: 'legacyword', meaning: '旧义', source: 'AI' }
    })
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'legacyword',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    })
    await act(async () => { render(<SelectionPopup />) })
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })

    expect(await screen.findByText('旧义')).toBeDefined()
    expect(screen.queryByText('AI (Gemini)')).toBeTruthy()  // normalized to the current provider
    expect(screen.queryByText('AI')).toBeNull()             // no bare "AI" badge
  })

  it('P2-badge: an already-labeled "AI (GPT)" cached source is left unchanged', async () => {
    ;(getAiCache as any).mockResolvedValue({
      labeledword: { word: 'labeledword', meaning: '有源', source: 'AI (GPT)' }
    })
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'labeledword',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    })
    await act(async () => { render(<SelectionPopup />) })
    await act(async () => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })

    expect(await screen.findByText('有源')).toBeDefined()
    expect(screen.queryByText('AI (GPT)')).toBeTruthy()      // preserved — not rewritten to Gemini
    expect(screen.queryByText('AI (Gemini)')).toBeNull()
  })

  it('C2: a network translation result is written to ai_cache for instant reuse', async () => {
    // Local miss → goes to network; the returned gloss must be cached.
    ;(getAiCache as any).mockResolvedValue({})
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'serendipity',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 }) })
    })
    chromeMock.runtime.sendMessage.mockImplementation((msg: any, callback: any) => {
      if (msg.type === 'GET_TAB_STATE') callback({ enabled: true })
      if (msg.type === 'TRANSLATE_WORD') callback({ success: true, data: { word: 'serendipity', meaning: '机缘巧合', ipa_us: '/x/', source: 'AI (GPT)' } })
    })

    await act(async () => { render(<SelectionPopup />) })
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    // Wait for the network result to render, then assert it was cached.
    expect(await screen.findByText('机缘巧合')).toBeDefined()
    expect(putAiCache).toHaveBeenCalledWith([
      expect.objectContaining({ word: 'serendipity', meaning: '机缘巧合' })
    ])
  })
})
