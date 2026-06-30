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
  showIPA: true
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
    const btn = await screen.findByText(/标记已掌握/)
    await act(async () => { btn.click() })
    expect(mockAddKnown).toHaveBeenCalledWith('tear')
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
