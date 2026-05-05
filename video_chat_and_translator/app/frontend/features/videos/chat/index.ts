export { chat } from './client'
export { ChatPanel } from './ChatPanel'
export { ChatError, isChatError, type ChatErrorCode } from './errors'
export { extractTranscriptText, MAX_CONTEXT_CHARS } from './context'
export { ALL_PROVIDERS, providerDefaultModel, providerLabel } from './providers'
export {
  appendMessage,
  clearMessages,
  getMessages,
  setMessages,
  type StoredChatRecord,
} from './storage'
export type { ChatMessage, ChatProvider, ChatRequestInput, ChatResponse, ChatRole } from './types'
