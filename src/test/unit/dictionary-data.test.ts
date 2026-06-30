import { describe, it, expect } from 'vitest'
import oxford from '../../../oxford_5000.json'

const ox = oxford as unknown as Record<string, any>
const vals = Object.values(ox)
const tr = (w: string) => vals.filter(v => v.word?.toLowerCase() === w).map(v => v.translation || '')

describe('core dictionary glosses (oxford_5000.json)', () => {
  it('D1: has no empty translations', () => {
    const empty = vals.filter(v => !v.translation || !String(v.translation).trim())
    expect(empty.length).toBe(0)
  })

  it('D2: previously misaligned words show their own meaning', () => {
    expect(tr('appear').join('')).toContain('出现')
    expect(tr('appear').join('')).not.toContain('食欲')
    expect(tr('apple').join('')).toContain('苹果')
    expect(tr('appetite').join('')).toContain('食欲')
  })
})
