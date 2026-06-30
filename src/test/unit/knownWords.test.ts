import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory chrome.storage.local
let store: Record<string, any>
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (obj: Record<string, any>) => { Object.assign(store, obj) })
    }
  }
}
vi.stubGlobal('chrome', chromeMock)

// vocabulary.ts also writes to IndexedDB; stub it so storage logic runs in jsdom.
vi.mock('../../common/storage/indexed-db', () => ({
  initDB: vi.fn(async () => ({
    delete: vi.fn(async () => {}),
    transaction: () => ({ objectStore: () => ({ put: vi.fn(async () => {}) }), done: Promise.resolve() })
  }))
}))

import { addKnownWord, getKnownWords } from '../../common/storage/knownWords'
import { addToVocabulary, getVocabulary } from '../../common/storage/vocabulary'

describe('known-words storage — mutual exclusion with vocabulary', () => {
  beforeEach(() => { store = { vocabulary: [], knownWords: [] } })

  it('K4a: addKnownWord removes the word from the vocabulary book', async () => {
    store.vocabulary = [{ word: 'Foo', meaning: 'x', timestamp: 1, sourceUrl: '' }]
    await addKnownWord('foo')
    expect(await getKnownWords()).toContain('foo')
    expect((await getVocabulary()).some(v => v.word.toLowerCase() === 'foo')).toBe(false)
  })

  it('K4b: addToVocabulary removes the word from the known-words list', async () => {
    store.knownWords = ['bar']
    await addToVocabulary({ word: 'bar', meaning: 'y', timestamp: 1, sourceUrl: '' } as any)
    expect((await getVocabulary()).some(v => v.word.toLowerCase() === 'bar')).toBe(true)
    expect(await getKnownWords()).not.toContain('bar')
  })
})
