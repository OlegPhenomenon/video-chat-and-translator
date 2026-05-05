// Shared types for FT-020 chat feature.
// Frozen contracts per implementation-plan STEP-01.

export type ChatProvider = 'openai' | 'anthropic' | 'groq'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatRequestInput {
  provider: ChatProvider
  apiKey: string
  model?: string
  messages: ChatMessage[]
  /** Optional transcript context. Adapter prepends it as a system message before history. */
  transcript?: string | null
  signal?: AbortSignal
}

export interface ChatResponse {
  message: ChatMessage
}

/** Internal contract that every provider adapter implements (CTR-02). */
export type ProviderAdapter = (input: AdapterInput) => Promise<ChatResponse>

export interface AdapterInput {
  apiKey: string
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
}
