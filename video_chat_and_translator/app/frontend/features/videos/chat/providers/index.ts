import type { ChatProvider, ProviderAdapter } from '../types'
import { anthropicAdapter } from './anthropic'
import { groqAdapter } from './groq'
import { openaiAdapter } from './openai'

export const PROVIDERS: Record<ChatProvider, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
}
