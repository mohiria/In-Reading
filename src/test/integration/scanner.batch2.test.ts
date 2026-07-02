import { describe, it, expect } from 'vitest'
import { scanAndHighlight } from '../../content/engine/scanner'

// All hard words below are verified absent from the real confusion-map, so mockDict
// is the only annotation source (scanAndHighlight consults defaultConfusionMap internally).
const mockDict = {
  arduous: { meaning: '艰巨的' },
  meticulous: { meaning: '一丝不苟的' },
  ephemeral: { meaning: '短暂的' },
  quintessential: { meaning: '典型的' },
  ubiquitous: { meaning: '无处不在的' },
  serendipity: { meaning: '机缘巧合' }
} as any

const countWord = (root: ParentNode | null, word: string) =>
  root?.querySelectorAll(`.ll-word-container[data-word="${word}"]`).length ?? 0

describe('Scanner Batch 2 — content-region filtering', () => {
  it('B2-1/B2-2: skips footer/aside/contentinfo landmarks but annotates main content', async () => {
    document.body.innerHTML = `
      <main role="main"><article>
        <p>The arduous expedition was fully documented.</p>
      </article></main>
      <footer><p>This meticulous disclaimer governs all usage.</p></footer>
      <aside><p>An ephemeral sidebar note appears here today.</p></aside>
      <div role="contentinfo"><p>Our quintessential mission statement stands firm.</p></div>
    `
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)

    expect(countWord(document.querySelector('main'), 'arduous')).toBeGreaterThanOrEqual(1)
    expect(countWord(document.querySelector('footer'), 'meticulous')).toBe(0)
    expect(countWord(document.querySelector('aside'), 'ephemeral')).toBe(0)
    expect(countWord(document.querySelector('[role="contentinfo"]'), 'quintessential')).toBe(0)
  })

  it('B2-3: does NOT reject a content container whose class merely contains "header"', async () => {
    document.body.innerHTML = `
      <main role="main"><article>
        <div class="article-header">Arduous breaking development unfolds</div>
        <p>Some filler context follows here.</p>
      </article></main>
    `
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)
    expect(countWord(document.querySelector('.article-header'), 'arduous')).toBeGreaterThanOrEqual(1)
  })

  it('B2-4: still skips an unambiguous UI class (sidebar)', async () => {
    document.body.innerHTML = `
      <main role="main"><article>
        <div class="sidebar">Arduous related links column</div>
        <p>Main body context sentence here.</p>
      </article></main>
    `
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)
    expect(countWord(document.querySelector('.sidebar'), 'arduous')).toBe(0)
  })

  it('B2-5: does NOT wholesale-drop a link-dense content block inside an article', async () => {
    document.body.innerHTML = `
      <main role="main"><article>
        <div class="card-list">
          <a href="#">Ubiquitous productivity habits</a>
          <a href="#">Meticulous planning methods</a>
        </div>
      </article></main>
    `
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)
    expect(countWord(document.querySelector('.card-list'), 'ubiquitous')).toBeGreaterThanOrEqual(1)
    expect(countWord(document.querySelector('.card-list'), 'meticulous')).toBeGreaterThanOrEqual(1)
  })

  it('B2-6: still annotates deeply nested content (perf short-circuit keeps correctness)', async () => {
    const open = '<div>'.repeat(50)
    const close = '</div>'.repeat(50)
    document.body.innerHTML = `<main role="main"><article>${open}<p>A serendipity moment arrives.</p>${close}</article></main>`
    await scanAndHighlight(document.body, 'CEFR_A1', new Set(), mockDict)
    expect(countWord(document.querySelector('main'), 'serendipity')).toBeGreaterThanOrEqual(1)
  })
})
