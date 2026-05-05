import { ChatError } from '../errors'
import { providerBaseUrl } from '../providers'
import type { AdapterInput, ChatResponse } from '../types'

const PROVIDER = 'groq' as const

// Groq is OpenAI-compatible: /openai/v1/chat/completions with Bearer auth.
export async function groqAdapter(input: AdapterInput): Promise<ChatResponse> {
  const url = `${providerBaseUrl(PROVIDER)}/openai/v1/chat/completions`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: input.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ChatError({
      provider: PROVIDER,
      code: 'network',
      message:
        'Не удалось выполнить запрос. Возможны проблемы сети или CORS (запрос идёт напрямую из браузера к Groq).',
    })
  }

  if (response.status === 401 || response.status === 403) {
    throw new ChatError({
      provider: PROVIDER,
      code: 'invalid_api_key',
      status: response.status,
      message: 'Проверьте API key и попробуйте ещё раз.',
    })
  }

  if (response.status === 429) {
    const retryHeader = response.headers.get('retry-after') ?? response.headers.get('Retry-After')
    const retryAfterSeconds = retryHeader ? Number(retryHeader) : undefined
    throw new ChatError({
      provider: PROVIDER,
      code: 'rate_limit',
      status: response.status,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      message: 'Достигнут лимит запросов у Groq. Подождите и повторите попытку.',
    })
  }

  if (!response.ok) {
    const bodyText = await safeReadText(response)
    throw new ChatError({
      provider: PROVIDER,
      code: 'provider_error',
      status: response.status,
      message: `Ошибка Groq (${response.status}). ${bodyText.slice(0, 300)}`,
    })
  }

  const data = await safeReadJson(response)
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content) {
    throw new ChatError({
      provider: PROVIDER,
      code: 'invalid_response',
      message: 'Groq вернул ответ без текста сообщения.',
    })
  }

  return { message: { role: 'assistant', content } }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function safeReadJson(response: Response): Promise<{ choices?: Array<{ message?: { content?: string } }> }> {
  try {
    return (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  } catch {
    throw new ChatError({
      provider: PROVIDER,
      code: 'invalid_response',
      message: 'Groq вернул некорректный JSON.',
    })
  }
}
