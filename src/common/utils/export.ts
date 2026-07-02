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

// Tokenizes CSV text into rows of fields, honouring RFC-4180 quoting
// (`""` = literal quote; commas/newlines inside quotes are literal).
const tokenizeCSV = (text: string): string[][] => {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const dateToTimestamp = (s: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return Date.now()
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
}

/**
 * Parses a CSV produced by {@link toCSV} back into SavedWord[].
 * Handles the UTF-8 BOM, CRLF rows, `""`-escaped quotes and quoted
 * fields containing commas/newlines. Rows without a `word` are dropped.
 */
export const parseVocabCSV = (text: string): SavedWord[] => {
  const rows = tokenizeCSV(text.replace(/^﻿/, ''))
  if (rows.length <= 1) return []
  return rows.slice(1).reduce<SavedWord[]>((acc, cols) => {
    const [word = '', ipa = '', meaning = '', context = '', sourceUrl = '', date = ''] = cols
    if (!word.trim()) return acc
    acc.push({
      word: word.trim(),
      ipa,
      meaning,
      context,
      sourceUrl,
      timestamp: dateToTimestamp(date),
    })
    return acc
  }, [])
}

// Normalizes raw tokens to a deduped, lowercased list of valid words.
const normalizeKnown = (tokens: string[]): string[] => {
  const seen = new Set<string>()
  return tokens
    .map(t => t.trim().toLowerCase())
    .filter(w => /^[a-z][a-z'-]*$/.test(w))
    .filter(w => (seen.has(w) ? false : (seen.add(w), true)))
}

/**
 * Serializes a known-words list to a single-column UTF-8 (BOM) CSV
 * with header `word`, mirroring {@link toCSV}.
 */
export const toKnownCSV = (words: string[]): string =>
  '﻿' + ['word', ...words.map(escapeCSV)].join('\r\n')

/**
 * Parses a known-words CSV (single `word` column, header skipped) into a
 * deduped, lowercased array. Strips BOM and non-word tokens.
 */
export const parseKnownCSV = (text: string): string[] => {
  const rows = tokenizeCSV(text.replace(/^﻿/, ''))
  if (rows.length <= 1) return []
  return normalizeKnown(rows.slice(1).map(cols => cols[0] ?? ''))
}
