
import { describe, it, expect, beforeEach } from 'vitest'
import { scanAndHighlight, annotateWord, reannotateWord } from '../../content/engine/scanner'

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

  it('P3: annotateWord adds only the target word and never densifies other spaced words', () => {
    document.body.innerHTML = `<main role="main"><article>
      <p id="p1">extension apple alpha</p>
      <p id="p2">extension apple beta</p>
      <p id="p3">extension apple gamma</p>
      <p id="p4">extension apple delta</p>
      <p id="p5">extension apple omega</p>
    </article></main>`

    // 1. Initial scan annotates the difficult word "extension" with gap spacing.
    const dict = { extension: { word: 'extension', meaning: '扩展', cefr: ['a1'] } } as any
    // scanAndHighlight is async but local-only here (no dbLookup) → resolves synchronously enough;
    // await to be safe.
    return scanAndHighlight(document.body, 'CEFR_A1', new Set(), dict).then(() => {
      const hasExt = (id: string) => !!document.getElementById(id)?.querySelector('.ll-word-container[data-word="extension"]')
      const hasApple = (id: string) => !!document.getElementById(id)?.querySelector('.ll-word-container[data-word="apple"]')

      // extension is spaced: p1,p3,p5 shown; p2,p4 skipped
      const extBefore = document.querySelectorAll('.ll-word-container[data-word="extension"]').length
      expect(extBefore).toBe(3)
      expect(hasExt('p2')).toBe(false)
      expect(hasExt('p4')).toBe(false)

      // 2. Save "apple" → targeted annotation.
      annotateWord(document.body, 'apple', { word: 'apple', meaning: '苹果' } as any, 'CEFR_A1')

      // apple is annotated, itself spaced (p1,p3,p5)
      expect(hasApple('p1')).toBe(true)
      expect(hasApple('p3')).toBe(true)
      expect(hasApple('p5')).toBe(true)
      expect(hasApple('p2')).toBe(false)
      expect(hasApple('p4')).toBe(false)

      // extension is UNTOUCHED — no collateral densification into the gap blocks.
      expect(document.querySelectorAll('.ll-word-container[data-word="extension"]').length).toBe(3)
      expect(hasExt('p2')).toBe(false)
      expect(hasExt('p4')).toBe(false)
    })
  })

  it('P4: reannotateWord restores an un-marked word difficulty-gated & spaced (no full rescan)', async () => {
    document.body.innerHTML = `<main role="main"><article>
      <p id="q1">obscure banana alpha</p>
      <p id="q2">obscure banana beta</p>
      <p id="q3">obscure banana gamma</p>
      <p id="q4">obscure banana delta</p>
      <p id="q5">obscure banana omega</p>
    </article></main>`
    // 'obscure' was suppressed as known → unannotated. Un-mark → re-annotate in place.
    const dbLookup = async (words: string[]) =>
      (words.includes('obscure') ? { obscure: { word: 'obscure', meaning: '晦涩', cefr: ['a1'] } } : {}) as any

    await reannotateWord(document.body, 'obscure', 'CEFR_A1', 'US', true, dbLookup)

    const has = (id: string) => !!document.getElementById(id)?.querySelector('.ll-word-container[data-word="obscure"]')
    expect(document.querySelectorAll('.ll-word-container[data-word="obscure"]').length).toBe(3)
    expect(has('q1')).toBe(true)
    expect(has('q2')).toBe(false)
    expect(has('q3')).toBe(true)
    expect(has('q4')).toBe(false)
    expect(has('q5')).toBe(true)
  })

  it('P5: reannotateWord respects difficulty — an easy word is not re-annotated', async () => {
    document.body.innerHTML = `<main role="main"><article><p id="r1">obscure text here.</p></article></main>`
    const dbLookup = async () => ({ obscure: { word: 'obscure', meaning: 'x', cefr: ['a1'] } } as any)
    // user at CET6: an A1 word is below the annotation threshold → must NOT annotate.
    await reannotateWord(document.body, 'obscure', 'CET6', 'US', true, dbLookup)
    expect(document.querySelectorAll('.ll-word-container[data-word="obscure"]').length).toBe(0)
  })
})
