import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncSetItem, syncRemoveItem, readSyncedByPrefix, markSyncOverLimit, getSyncOverLimit, PREFIX_VOCAB, PREFIX_KNOWN } from '../../common/storage/sync'

let store: Record<string, any>
let localStore: Record<string, any>
const chromeMock = {
  storage: {
    sync: {
      get: vi.fn(async (keys: any) => {
        if (keys === null || keys === undefined) return { ...store }
        if (typeof keys === 'string') return store[keys] !== undefined ? { [keys]: store[keys] } : {}
        return {}
      }),
      set: vi.fn(async (obj: any) => { Object.assign(store, obj) }),
      remove: vi.fn(async (key: string) => { delete store[key] })
    },
    local: {
      get: vi.fn(async (k: any) => (typeof k === 'string' ? (localStore[k] !== undefined ? { [k]: localStore[k] } : {}) : { ...localStore })),
      set: vi.fn(async (obj: any) => { Object.assign(localStore, obj) })
    }
  }
}
vi.stubGlobal('chrome', chromeMock)

describe('sync helper (per-word storage.sync)', () => {
  beforeEach(() => { store = {}; localStore = {}; vi.clearAllMocks() })

  it('S1: writes an item and reads it back by prefix', async () => {
    expect(await syncSetItem(PREFIX_VOCAB + 'apple', { word: 'apple', meaning: '苹果' })).toBe(true)
    expect(await syncSetItem(PREFIX_KNOWN + 'the', 1)).toBe(true)
    expect((await readSyncedByPrefix(PREFIX_VOCAB)).apple).toBeTruthy()
    expect((await readSyncedByPrefix(PREFIX_KNOWN)).the).toBe(1)
  })

  it('S2: removes an item', async () => {
    await syncSetItem(PREFIX_KNOWN + 'the', 1)
    await syncRemoveItem(PREFIX_KNOWN + 'the')
    expect(Object.keys(await readSyncedByPrefix(PREFIX_KNOWN))).toHaveLength(0)
  })

  it('S3: refuses to write past the 512-item quota (over limit → false, no write)', async () => {
    for (let i = 0; i < 512; i++) store['k:' + i] = 1
    const ok = await syncSetItem(PREFIX_VOCAB + 'newword', { word: 'newword', meaning: 'x' })
    expect(ok).toBe(false)
    expect(store['v:newword']).toBeUndefined()
  })

  it('S4: refuses an oversized single item (>8KB)', async () => {
    const big = { word: 'big', meaning: 'x'.repeat(9000) }
    expect(await syncSetItem(PREFIX_VOCAB + 'big', big)).toBe(false)
    expect(store['v:big']).toBeUndefined()
  })

  it('S5: over-limit flag round-trips (set true, then cleared) so the banner is not sticky', async () => {
    await markSyncOverLimit(true)
    expect(await getSyncOverLimit()).toBe(true)
    await markSyncOverLimit(false)
    expect(await getSyncOverLimit()).toBe(false)
  })
})
