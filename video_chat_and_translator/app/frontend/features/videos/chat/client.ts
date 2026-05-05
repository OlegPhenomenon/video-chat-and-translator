import { ChatError } from './errors'
import { providerDefaultModel } from './providers'
import { PROVIDERS } from './providers/index'
import type { ChatMessage, ChatRequestInput, ChatResponse } from './types'

const TRANSCRIPT_PREAMBLE =
  'Ниже — транскрипт видео, по которому пользователь задаёт вопросы. Используй его как основной источник фактов. Если в транскрипте нет ответа — скажи об этом.'

function buildMessages(input: ChatRequestInput): ChatMessage[] {
  const out: ChatMessage[] = []
  if (input.transcript && input.transcript.trim()) {
    out.push({ role: 'system', content: `${TRANSCRIPT_PREAMBLE}\n\n${input.transcript}` })
  }
  for (const m of input.messages) out.push(m)
  return out
}

export async function chat(input: ChatRequestInput): Promise<ChatResponse> {
  const adapter = PROVIDERS[input.provider]
  if (!adapter) {
    throw new ChatError({
      provider: input.provider,
      code: 'unknown',
      message: `Провайдер не зарегистрирован: ${input.provider}`,
    })
  }

  if (!input.apiKey || !input.apiKey.trim()) {
    throw new ChatError({
      provider: input.provider,
      code: 'invalid_api_key',
      message: 'API key обязателен.',
    })
  }

  const model = input.model && input.model.trim() ? input.model.trim() : providerDefaultModel(input.provider)
  const messages = buildMessages(input)

  return adapter({
    apiKey: input.apiKey,
    model,
    messages,
    signal: input.signal,
  })
}
