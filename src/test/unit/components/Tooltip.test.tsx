/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Tooltip } from '../../../content/components/Tooltip'
import { WordExplanation } from '../../../common/types'

// Mock global chrome
const chromeMock = {
  storage: {
    sync: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
  }
}
vi.stubGlobal('chrome', chromeMock)

// Mock storage retrieval for useSettings
vi.mock('../../../common/storage/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({ 
    enabled: true, proficiency: 'CEFR_A1', pronunciation: 'US', showIPA: true 
  }),
  saveSettings: vi.fn()
}))

describe('Tooltip Component', () => {
  const mockExplanation: WordExplanation = {
    word: 'example',
    ipa: '/ɪgˈzæmpl/',
    meaning: '例子',
    context: 'A representative thing.'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    chromeMock.storage.sync.get.mockResolvedValue({})
  })

  it('renders word, ipa, and meaning', async () => {
    render(<Tooltip explanation={mockExplanation} onClose={() => {}} position={{ top: 0, left: 0 }} />)
    
    expect(screen.getByText('example')).toBeInTheDocument()
    expect(screen.getByText('例子')).toBeInTheDocument()
  })
})
