
import { describe, it, expect, beforeEach } from 'vitest'
import { scanAndHighlight } from '../../content/engine/scanner'

describe('Scanner Integration - MS Learn Simulation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header role="banner">
        <nav role="navigation">Documentation (extension)</nav>
      </header>
      <main role="main">
        <article>
          <h1>Publish extension</h1>
          <h2 id="h2-nested"><span>Nested extension title</span></h2>
          <div role="heading" aria-level="3">Heading Role extension</div>
          <p id="p1">An extension is a tool.</p>
          <p id="p2">One extension per user.</p>
          <p id="p3">This extension is good.</p>
          <p id="p4">Review the extension.</p>
          <p id="p5">Now the extension is live.</p>
        </article>
      </main>
      <footer>© 2026 extension</footer>
    `
  })

  it('should only translate in main article and respect memory gaps', async () => {
    const mockDict = { 'extension': { meaning: '扩展', ipa: 'ɪkˈstenʃn' } } as any
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    // 1. Check isolation: No translations in header/footer/h1
    expect(document.querySelector('header')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('footer')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('h1')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.getElementById('h2-nested')?.querySelectorAll('.ll-word-container').length).toBe(0)
    expect(document.querySelector('[role="heading"]')?.querySelectorAll('.ll-word-container').length).toBe(0)

    // 2. Check spaced reinforcement for 'extension' specifically.
    // Assert on the 'extension' container, not whole-paragraph text: other real
    // confusion-map words (e.g. 'one' in p2) are legitimately annotated too.
    const hasExt = (id: string) =>
      !!document.getElementById(id)?.querySelector('.ll-word-container[data-word="extension"]')

    expect(hasExt('p1')).toBe(true)  // 1st: Show
    expect(hasExt('p2')).toBe(false) // 2nd: Gap (REFRESH_GAP=2 means skip 1)
    expect(hasExt('p3')).toBe(true)  // 3rd: Refresh Show
    expect(hasExt('p4')).toBe(false) // 4th: Gap
    expect(hasExt('p5')).toBe(true)  // 5th: Refresh Show
  })

  it('P1: core dictionary overrides a stale saved-word snapshot in userDict', async () => {
    document.body.innerHTML = `<main role="main"><article><p id="px">They appear today.</p></article></main>`
    // userDict carries the stale saved snapshot; dbLookup returns the corrected core entry.
    const userDict = { appear: { word: 'appear', meaning: '食欲', cefr: [] } } as any
    const dbLookup = async (words: string[]) =>
      (words.includes('appear') ? { appear: { word: 'appear', meaning: '出现', cefr: [] } } : {}) as any

    await scanAndHighlight(document.body, 'CEFR_A1', new Set(['appear']), userDict, 'US', dbLookup)

    const container = document.querySelector('.ll-word-container[data-word="appear"]')
    expect(container).toBeTruthy()
    const translation = container?.querySelector('.ll-translation')?.textContent || ''
    expect(translation).toContain('出现')
    expect(translation).not.toContain('食欲')
  })
})
