
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scanAndHighlight, unhighlightWord } from '../../content/engine/scanner'

describe('Scanner Unit Tests - Smart Filtering & Reinforcement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should ignore restricted tags like H1 and KBD', async () => {
    document.body.innerHTML = `
      <h1>Heading (apple)</h1>
      <p id="target">Paragraph (apple)</p>
      <kbd>Key (apple)</kbd>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    expect(document.querySelector('h1')?.querySelector('.ll-word-container')).toBeNull()
    expect(document.querySelector('kbd')?.querySelector('.ll-word-container')).toBeNull()
    expect(document.getElementById('target')?.querySelector('.ll-word-container')).not.toBeNull()
  })

  it('should implement Spaced Reinforcement (skip 1 paragraph)', async () => {
    document.body.innerHTML = `
      <p id="p1">apple (show)</p>
      <p id="p2">apple (skip 1)</p>
      <p id="p3">apple (refresh show)</p>
      <p id="p4">apple (skip 2)</p>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    const getT = (id: string) => document.getElementById(id)?.querySelector('.ll-translation')?.textContent || ''

    expect(getT('p1')).toContain('苹果')
    expect(getT('p2')).toBe('')
    expect(getT('p3')).toContain('苹果')
    expect(getT('p4')).toBe('')
  })

  it('should not show US/UK prefix in on-page translations', async () => {
    document.body.innerHTML = '<p id="target">apple</p>'
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    
    // Test with US
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'US')
    let translation = document.querySelector('.ll-translation')?.textContent || ''
    expect(translation).toContain('ˈæpl')
    expect(translation).not.toContain('US ')
    expect(translation).not.toContain('UK ')

    // Test with UK
    document.body.innerHTML = '<p id="target">apple</p>'
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict, 'UK')
    translation = document.querySelector('.ll-translation')?.textContent || ''
    expect(translation).toContain('ˈæpl')
    expect(translation).not.toContain('US ')
    expect(translation).not.toContain('UK ')
  })

  it('should translate paragraphs inside structural containers like header', async () => {
    document.body.innerHTML = `
      <header id="header">
        <div class="nav-bar">
          <a href="/">Home</a>
          <a href="/docs">Docs</a>
        </div>
        <p id="summary">A simple, open format for giving agents new capabilities.</p>
      </header>
    `
    const mockDict = { 'simple': { meaning: '简单的' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    // The summary paragraph should be translated even though it is inside a header
    expect(document.querySelector('#summary .ll-word-container')).not.toBeNull()
    // The nav-bar part might be skipped if link density is high, but the P saves the header from being rejected as a whole
  })

  it('should still skip sidebars and navigation based on class names', async () => {
    document.body.innerHTML = `
      <div class="main-content"><p>apple (show)</p></div>
      <div class="sidebar-wrapper"><p>apple (skip)</p></div>
      <nav class="custom-nav"><p>apple (skip)</p></nav>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    expect(document.querySelector('.main-content .ll-word-container')).not.toBeNull()
    expect(document.querySelector('.sidebar-wrapper .ll-word-container')).toBeNull()
    expect(document.querySelector('.custom-nav .ll-word-container')).toBeNull()
  })

  it('should skip link-heavy navigation areas (Link Density)', async () => {
    document.body.innerHTML = `
      <div id="nav-area">
        <a href="#">Home</a>
        <a href="#">Products</a>
        <a href="#">Services</a>
        <a href="#">Contact apple</a>
      </div>
      <div id="content-area">
        <p>This is a paragraph about an apple.</p>
      </div>
    `
    const mockDict = { 'apple': { meaning: '苹果', ipa: 'ˈæpl' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    // The nav-area has apple inside a link-heavy context, it should be skipped
    expect(document.querySelector('#nav-area .ll-word-container')).toBeNull()
    // The content-area should still have the translation
    expect(document.querySelector('#content-area .ll-word-container')).not.toBeNull()
  })
})
