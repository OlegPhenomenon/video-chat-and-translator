import { ChatError } from '../errors'
import { providerBaseUrl } from '../providers'
import type { AdapterInput, ChatMessage, ChatResponse } from '../types'

const PROVIDER = 'anthropic' as const

// Anthropic API takes `system` outside `messages`. Mitigates ER-01 from plan.
function splitSystem(messages: ChatMessage[]): { system: string; rest: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const systemParts: string[] = []
  const rest: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content)
      continue
    }
    rest.push({ role: m.role, content: m.content })
  }
  return { system: systemParts.join('\n\n'), rest }
}

export async function anthropicAdapter(input: AdapterInput): Promise<ChatResponse> {
  const url = `${providerBaseUrl(PROVIDER)}/v1/messages`
  const { system, rest } = splitSystem(input.messages)

  // Anthropic requires max_tokens explicitly. Use a sane default.
  const body: Record<string, unknown> = {
    model: input.model,
    max_tokens: 1024,
    messages: rest,
  }
  if (system) body.system = system

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
        // dangerous-direct-browser-access opts in to running from a browser without a server proxy.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: input.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ChatError({
      provider: PROVIDER,
      code: 'network',
      message:
        'Не удалось выполнить запрос. Возможны проблемы сети или CORS (запрос идёт напрямую из браузера к Anthropic).',
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
      message: 'Достигнут лимит запросов у Anthropic. Подождите и повторите попытку.',
    })
  }

  if (!response.ok) {
    const bodyText = await safeReadText(response)
    throw new ChatError({
      provider: PROVIDER,
      code: 'provider_error',
      status: response.status,
      message: `Ошибка Anthropic (${response.status}). ${bodyText.slice(0, 300)}`,
    })
  }

  const data = await safeReadJson(response)
  // Anthropic shape: { content: [{ type: "text", text: "..." }, ...], ... }
  const content = data?.content?.find((p) => p?.type === 'text')?.text
  if (typeof content !== 'string' || !content) {
    throw new ChatError({
      provider: PROVIDER,
      code: 'invalid_response',
      message: 'Anthropic вернул ответ без текстового блока.',
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

async function safeReadJson(response: Response): Promise<{ content?: Array<{ type?: string; text?: string }> }> {
  try {
    return (await response.json()) as { content?: Array<{ type?: string; text?: string }> }
  } catch {
    throw new ChatError({
      provider: PROVIDER,
      code: 'invalid_response',
      message: 'Anthropic вернул некорректный JSON.',
    })
  }
}
