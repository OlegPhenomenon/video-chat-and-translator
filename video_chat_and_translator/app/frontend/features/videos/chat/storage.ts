// Per-video chat history persistence (CTR-04).
// Lives in the same IndexedDB instance as videos, in store `chat_messages`.

import { CHAT_STORE_NAME, normalizeStorageError, openDB } from '../storage'
import type { ChatMessage } from './types'

export interface StoredChatRecord {
  videoId: string
  messages: ChatMessage[]
  updatedAt: string
}

export async function getMessages(videoId: string): Promise<ChatMessage[]> {
  let db: IDBDatabase
  try {
    db = await openDB()
  } catch {
    // FM-06: IDB unavailable. Caller treats this as empty history.
    return []
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE_NAME, 'readonly')
    const store = tx.objectStore(CHAT_STORE_NAME)
    const request = store.get(videoId)

    request.onsuccess = () => {
      const result = (request.result as StoredChatRecord | undefined) ?? null
      resolve(result?.messages ?? [])
    }
    request.onerror = () => reject(normalizeStorageError(request.error))
  })
}

export async function setMessages(videoId: string, messages: ChatMessage[]): Promise<void> {
  let db: IDBDatabase
  try {
    db = await openDB()
  } catch {
    // FM-06 — write skipped, in-memory state still works.
    return
  }

  const record: StoredChatRecord = {
    videoId,
    messages,
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE_NAME, 'readwrite')
    const store = tx.objectStore(CHAT_STORE_NAME)
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(normalizeStorageError(request.error))
    tx.onerror = () => reject(normalizeStorageError(tx.error))
  })
}

export async function appendMessage(videoId: string, message: ChatMessage): Promise<ChatMessage[]> {
  const current = await getMessages(videoId)
  const next = [...current, message]
  await setMessages(videoId, next)
  return next
}

export async function clearMessages(videoId: string): Promise<void> {
  let db: IDBDatabase
  try {
    db = await openDB()
  } catch {
    return
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_STORE_NAME, 'readwrite')
    const store = tx.objectStore(CHAT_STORE_NAME)
    const request = store.delete(videoId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(normalizeStorageError(request.error))
  })
}
