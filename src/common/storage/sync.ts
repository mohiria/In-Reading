// Cross-device sync of the vocabulary book and the known-words list via
// chrome.storage.sync, using ONE key per word (prefix + lowercased word).
//
// Per-word keys give correct multi-device merge semantics for free: Chrome merges
// storage.sync per key, so two devices adding different words both survive, and a
// delete (key removal) propagates. The cost is the storage.sync budget:
//   - 100 KB total, 8 KB per item, 512 items (shared with the `settings` item).
// When a write would exceed the budget, syncSetItem returns false (over limit) and
// does NOT write — the caller keeps the word local-only and flags it for the UI.

export const PREFIX_VOCAB = 'v:'
export const PREFIX_KNOWN = 'k:'
const OVER_LIMIT_FLAG = 'syncOverLimit'

const QUOTA_ITEMS = 512
const QUOTA_BYTES = 102400
const QUOTA_BYTES_PER_ITEM = 8192

const byteLen = (s: string): number => new TextEncoder().encode(s).length

/**
 * Writes a single sync item. Returns false WITHOUT writing when it would exceed the
 * per-item, item-count, or total-byte quota (caller then keeps it local-only).
 */
export const syncSetItem = async (key: string, value: unknown): Promise<boolean> => {
  try {
    const payload = JSON.stringify(value)
    if (byteLen(key) + byteLen(payload) + 2 > QUOTA_BYTES_PER_ITEM) return false

    const all = await chrome.storage.sync.get(null)
    const exists = Object.prototype.hasOwnProperty.call(all, key)
    if (!exists && Object.keys(all).length >= QUOTA_ITEMS) return false

    let used = 0
    for (const [k, v] of Object.entries(all)) {
      if (k === key) continue
      used += byteLen(k) + byteLen(JSON.stringify(v))
    }
    if (used + byteLen(key) + byteLen(payload) > QUOTA_BYTES) return false

    await chrome.storage.sync.set({ [key]: value })
    return true
  } catch {
    return false
  }
}

export const syncRemoveItem = async (key: string): Promise<void> => {
  try { await chrome.storage.sync.remove(key) } catch { /* offline / no chrome */ }
}

/** All sync items whose key starts with `prefix` → { bareKey(without prefix): value }. */
export const readSyncedByPrefix = async (prefix: string): Promise<Record<string, any>> => {
  const out: Record<string, any> = {}
  try {
    const all = await chrome.storage.sync.get(null)
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v
    }
  } catch { /* ignore */ }
  return out
}

/** Records that the last sync write hit the quota, so the UI can prompt the user. */
export const markSyncOverLimit = async (over: boolean): Promise<void> => {
  try { await chrome.storage.local.set({ [OVER_LIMIT_FLAG]: over }) } catch { /* ignore */ }
}

export const getSyncOverLimit = async (): Promise<boolean> => {
  try { return !!(await chrome.storage.local.get(OVER_LIMIT_FLAG))[OVER_LIMIT_FLAG] } catch { return false }
}
