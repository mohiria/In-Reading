import { SavedWord } from '../types'
import { formatIPA } from './format'

const escapeCSV = (value: unknown): string => {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const formatDate = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const HEADER = ['word', 'ipa', 'meaning', 'context', 'sourceUrl', 'date']

/**
 * Serializes saved words to a UTF-8 (BOM) CSV with header
 * `word,ipa,meaning,context,sourceUrl,date`, importable by Excel and Anki.
 */
export const toCSV = (words: SavedWord[]): string => {
  const rows = words.map(w =>
    [w.word, formatIPA(w.ipa), w.meaning, w.context, w.sourceUrl, formatDate(w.timestamp)]
      .map(escapeCSV)
      .join(',')
  )
  return '﻿' + [HEADER.join(','), ...rows].join('\r\n')
}

export const downloadCSV = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
