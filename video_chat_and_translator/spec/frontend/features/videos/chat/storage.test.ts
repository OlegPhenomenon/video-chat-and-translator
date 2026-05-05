import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory IDB stub: enough surface for the helpers we test (get, put, delete on a single store).
function makeStubDB(): IDBDatabase {
  const store = new Map<string, unknown>()

  const makeRequest = (action: () => unknown): IDBRequest => {
    const req: Partial<IDBRequest> & {
      result: unknown
      onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null
      onerror: ((this: IDBRequest, ev: Event) => unknown) | null
      error: DOMException | null
    } = {
      result: undefined,
      onsuccess: null,
      onerror: null,
      error: null,
    }
    queueMicrotask(() => {
      try {
        req.result = action()
        req.onsuccess?.call(req as IDBRequest, new Event('success'))
      } catch (e) {
        req.error = e as DOMException
        req.onerror?.call(req as IDBRequest, new Event('error'))
      }
    })
    return req as IDBRequest
  }

  const objectStore: Partial<IDBObjectStore> = {
    get: (key: IDBValidKey | IDBKeyRange) => makeRequest(() => store.get(String(key))),
    put: (value: unknown) => {
      const v = value as { videoId: string }
      return makeRequest(() => {
        store.set(v.videoId, value)
        return v.videoId
      })
    },
    delete: (key: IDBValidKey | IDBKeyRange) => makeRequest(() => store.delete(String(key))),
  }

  const tx: Partial<IDBTransaction> = {
    objectStore: () => objectStore as IDBObjectStore,
    onerror: null,
    onabort: null,
    oncomplete: null,
  }

  const db: Partial<IDBDatabase> = {
    transaction: () => tx as IDBTransaction,
    objectStoreNames: { contains: () => true } as unknown as DOMStringList,
  }

  return db as IDBDatabase
}

let stubDB: IDBDatabase

vi.mock('@/features/videos/storage', () => {
  return {
    CHAT_STORE_NAME: 'chat_messages',
    openDB: () => Promise.resolve(stubDB),
    normalizeStorageError: (err: unknown) => err,
    StorageError: class extends Error {},
  }
})

import {
  appendMessage,
  clearMessages,
  getMessages,
  setMessages,
} from '@/features/videos/chat'

describe('FT-020 chat storage (CTR-04)', () => {
  beforeEach(() => {
    stubDB = makeStubDB()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no record exists', async () => {
    const r = await getMessages('v-1')
    expect(r).toEqual([])
  })

  it('appendMessage persists and getMessages reads back in order', async () => {
    await appendMessage('v-1', { role: 'user', content: 'q1' })
    await appendMessage('v-1', { role: 'assistant', content: 'a1' })
    const r = await getMessages('v-1')
    expect(r).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
    ])
  })

  it('setMessages overwrites entire history', async () => {
    await appendMessage('v-1', { role: 'user', content: 'old' })
    await setMessages('v-1', [{ role: 'assistant', content: 'new' }])
    const r = await getMessages('v-1')
    expect(r).toEqual([{ role: 'assistant', content: 'new' }])
  })

  it('clearMessages removes the record per-video', async () => {
    await appendMessage('v-1', { role: 'user', content: 'q' })
    await appendMessage('v-2', { role: 'user', content: 'r' })
    await clearMessages('v-1')
    expect(await getMessages('v-1')).toEqual([])
    expect(await getMessages('v-2')).toEqual([{ role: 'user', content: 'r' }])
  })
})
