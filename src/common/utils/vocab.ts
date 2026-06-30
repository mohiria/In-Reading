import { SavedWord } from '../types'

export type TimeGroupKey = 'today' | 'thisWeek' | 'thisMonth' | 'earlier'

export interface VocabGroup {
  key: TimeGroupKey
  label: string
  words: SavedWord[]
}

const DAY = 24 * 60 * 60 * 1000
const LABELS: Record<TimeGroupKey, string> = { today: '今天', thisWeek: '本周', thisMonth: '本月', earlier: '更早' }
const ORDER: TimeGroupKey[] = ['today', 'thisWeek', 'thisMonth', 'earlier']

/**
 * Groups saved words by add time (local timezone, week starts Monday) into
 * 今天/本周/本月/更早, newest first within each group; empty groups are omitted.
 */
export const groupByAddedTime = (words: SavedWord[], now: number = Date.now()): VocabGroup[] => {
  const ref = new Date(now)
  const startOfToday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime()
  const mondayOffset = (new Date(startOfToday).getDay() + 6) % 7 // getDay: 0=Sun
  const startOfWeek = startOfToday - mondayOffset * DAY
  const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime()

  const buckets: Record<TimeGroupKey, SavedWord[]> = { today: [], thisWeek: [], thisMonth: [], earlier: [] }
  for (const w of [...words].sort((a, b) => b.timestamp - a.timestamp)) {
    const ts = w.timestamp
    if (ts >= startOfToday) buckets.today.push(w)
    else if (ts >= startOfWeek) buckets.thisWeek.push(w)
    else if (ts >= startOfMonth) buckets.thisMonth.push(w)
    else buckets.earlier.push(w)
  }

  return ORDER.filter(k => buckets[k].length > 0).map(k => ({ key: k, label: LABELS[k], words: buckets[k] }))
}
