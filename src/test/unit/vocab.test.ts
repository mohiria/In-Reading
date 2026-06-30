import { describe, it, expect } from 'vitest'
import { groupByAddedTime } from '../../common/utils/vocab'
import { SavedWord } from '../../common/types'

// Fixed reference time: Wed 2026-06-17 12:00 local. Week starts Monday (2026-06-15).
const NOW = new Date(2026, 5, 17, 12, 0, 0).getTime()
const DAY = 24 * 60 * 60 * 1000

const w = (word: string, ts: number): SavedWord =>
  ({ word, meaning: `释义-${word}`, sourceUrl: 'https://x', timestamp: ts } as SavedWord)

describe('groupByAddedTime', () => {
  it('T1: places words into today / this week / this month / earlier', () => {
    const words = [
      w('today1', NOW - 2 * 60 * 60 * 1000), // a few hours ago -> today
      w('week1', new Date(2026, 5, 16, 9).getTime()), // Tue this week -> thisWeek
      w('month1', new Date(2026, 5, 3, 9).getTime()), // 3rd, before this week -> thisMonth
      w('old1', new Date(2026, 3, 1, 9).getTime()) // April -> earlier
    ]
    const groups = groupByAddedTime(words, NOW)
    const byKey = Object.fromEntries(groups.map(g => [g.key, g.words.map(x => x.word)]))
    expect(byKey.today).toEqual(['today1'])
    expect(byKey.thisWeek).toEqual(['week1'])
    expect(byKey.thisMonth).toEqual(['month1'])
    expect(byKey.earlier).toEqual(['old1'])
  })

  it('T2: omits empty groups', () => {
    const groups = groupByAddedTime([w('today1', NOW - 60 * 1000)], NOW)
    expect(groups.map(g => g.key)).toEqual(['today'])
  })

  it('T3: orders newest first within a group', () => {
    const groups = groupByAddedTime(
      [w('older', NOW - 5 * 60 * 60 * 1000), w('newer', NOW - 1 * 60 * 60 * 1000)],
      NOW
    )
    expect(groups[0].words.map(x => x.word)).toEqual(['newer', 'older'])
  })
})
