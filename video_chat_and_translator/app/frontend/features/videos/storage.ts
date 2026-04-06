// Client-side video storage backed by IndexedDB.
// This module has no knowledge of Rails — all file/blob data stays in the browser.
// Videos are NOT synced across devices or shared via the server.

const DB_NAME = 'video_library'
const DB_VERSION = 1
const STORE_NAME = 'videos'

export type StorageErrorCode = 'unsupported' | 'quota_exceeded' | 'unknown'

export class StorageError extends Error {
  readonly code: StorageErrorCode

  constructor(message: string, code: StorageErrorCode) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

export interface StoredVideoRecord {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
  updatedAt: string
  file: File
}

function openDB(): Promise<IDBDatabase> {
  if (!window.indexedDB) {
    return Promise.reject(new StorageError('IndexedDB is not supported in this browser.', 'unsupported'))
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)
    request.onerror = () => reject(normalizeError(request.error))
  })
}

function normalizeError(error: DOMException | null | unknown): StorageError {
  if (error instanceof StorageError) return error
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return new StorageError('Not enough storage space to save this video.', 'quota_exceeded')
    }
  }
  const message = error instanceof Error ? error.message : 'An unexpected storage error occurred.'
  return new StorageError(message, 'unknown')
}

export async function saveVideo(file: File): Promise<StoredVideoRecord> {
  const db = await openDB()
  const now = new Date().toISOString()
  const record: StoredVideoRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: now,
    updatedAt: now,
    file,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(record)

    request.onsuccess = () => resolve(record)
    request.onerror = () => reject(normalizeError(request.error))
    tx.onerror = () => reject(normalizeError(tx.error))
  })
}

export async function listVideos(): Promise<StoredVideoRecord[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const records = (request.result as StoredVideoRecord[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(records)
    }
    request.onerror = () => reject(normalizeError(request.error))
  })
}

export async function findVideo(id: string): Promise<StoredVideoRecord | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve((request.result as StoredVideoRecord) ?? null)
    request.onerror = () => reject(normalizeError(request.error))
  })
}
