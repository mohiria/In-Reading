import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleSyncChange, startupReconcile } from '../../common/storage/syncReconcile'
import { PREFIX_VOCAB, PREFIX_KNOWN } from '../../common/storage/sync'

let local: Record<string, any>, sync: Record<string, any>
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (k: any) => (typeof k === 'string' ? (local[k] !== undefined ? { [k]: local[k] } : {}) : { ...local })),
      set: vi.fn(async (obj: any) => { Object.assign(local, obj) })
    },
    sync: {
      get: vi.fn(async (k: any) => (k === null || k === undefined ? { ...sync } : (typeof k === 'string' && sync[k] !== undefined ? { [k]: sync[k] } : {}))),
      set: vi.fn(async (obj: any) => { Object.assign(sync, obj) }),
      remove: vi.fn(async (key: string) => { delete sync[key] })
    }
  }
}
vi.stubGlobal('chrome', chromeMock)

describe('syncReconcile', () => {
  beforeEach(() => { local = {}; sync = {}; vi.clearAllMocks() })

  it('R1: a remote vocab add delta is applied to local; a removal delta deletes it', async () => {
    await handleSyncChange({ [PREFIX_VOCAB + 'apple']: { newValue: { word: 'apple', meaning: '苹果' } } })
    expect(local.vocabulary.map((w: any) => w.word)).toContain('apple')
    await handleSyncChange({ [PREFIX_VOCAB + 'apple']: { newValue: undefined } })
    expect((local.vocabulary || []).length).toBe(0)
  })

  it('R2: a remote known add/remove delta is applied to local', async () => {
    await handleSyncChange({ [PREFIX_KNOWN + 'the']: { newValue: 1 } })
    expect(local.knownWords).toContain('the')
    await handleSyncChange({ [PREFIX_KNOWN + 'the']: { newValue: undefined } })
    expect(local.knownWords).not.toContain('the')
  })

  it('R3: startup with empty sync seeds sync from local', async () => {
    local.vocabulary = [{ word: 'Apple', meaning: '苹果' }]
    local.knownWords = ['the']
    await startupReconcile()
    expect(sync['v:apple']).toBeTruthy()
    expect(sync['k:the']).toBe(1)
  })

  it('R4: startup with populated sync union-adds missing words into local (over-limit local-only untouched)', async () => {
    sync['v:banana'] = { word: 'banana', meaning: '香蕉' }
    sync['k:and'] = 1
    local.vocabulary = [{ word: 'apple', meaning: '苹果' }] // local-only, no sync key
    local.knownWords = ['the']
    await startupReconcile()
    expect(local.vocabulary.map((w: any) => w.word)).toEqual(expect.arrayContaining(['apple', 'banana']))
    expect(local.knownWords).toEqual(expect.arrayContaining(['the', 'and']))
  })
})
