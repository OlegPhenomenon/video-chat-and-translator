import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chat, ChatError, isChatError, type ChatProvider } from '@/features/videos/chat'

interface FetchCall {
  url: string
  init: RequestInit | undefined
}

function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>): {
  calls: FetchCall[]
  restore: () => void
} {
  const calls: FetchCall[] = []
  const original = global.fetch
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const call: FetchCall = { url, init }
    calls.push(call)
    return handler(call)
  })
  ;(global as unknown as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch
  return {
    calls,
    restore: () => {
      ;(global as unknown as { fetch: typeof fetch }).fetch = original
    },
  }
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
  })
}

function textResponse(status: number, text: string, headers?: Record<string, string>): Response {
  return new Response(text, { status, headers: headers ?? {} })
}

const baseInput = (provider: ChatProvider) => ({
  provider,
  apiKey: 'sk-test-key',
  messages: [{ role: 'user' as const, content: 'привет' }],
})

describe('FT-020 chat client', () => {
  let restore = () => {}
  afterEach(() => {
    restore()
  })

  it('rejects empty api key with invalid_api_key', async () => {
    const m = mockFetch(() => jsonResponse(200, {}))
    restore = m.restore
    await expect(
      chat({ provider: 'openai', apiKey: '', messages: [{ role: 'user', content: 'q' }] })
    ).rejects.toMatchObject({ code: 'invalid_api_key' })
    expect(m.calls.length).toBe(0)
  })

  it('routes to OpenAI with correct host and bearer token', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'привет!' } }] })
    )
    restore = m.restore
    const r = await chat(baseInput('openai'))
    expect(r.message.content).toBe('привет!')
    expect(m.calls[0].url).toBe('https://api.openai.com/v1/chat/completions')
    const headers = m.calls[0].init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-test-key')
  })

  it('routes to Anthropic with x-api-key and splits system message', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { content: [{ type: 'text', text: 'hi' }] })
    )
    restore = m.restore
    await chat({
      ...baseInput('anthropic'),
      messages: [
        { role: 'system', content: 'be terse' },
        { role: 'user', content: 'hi' },
      ],
    })
    expect(m.calls[0].url).toBe('https://api.anthropic.com/v1/messages')
    const body = JSON.parse((m.calls[0].init?.body as string) ?? '{}')
    expect(body.system).toBe('be terse')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    const headers = m.calls[0].init?.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  it('routes to Groq via openai-compat path', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }] })
    )
    restore = m.restore
    await chat(baseInput('groq'))
    expect(m.calls[0].url).toBe('https://api.groq.com/openai/v1/chat/completions')
  })

  it('prepends transcript as system message before history (CTR-01)', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'a' } }] })
    )
    restore = m.restore
    await chat({
      ...baseInput('openai'),
      transcript: 'это содержимое видео',
    })
    const body = JSON.parse((m.calls[0].init?.body as string) ?? '{}')
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toContain('это содержимое видео')
    expect(body.messages[1].role).toBe('user')
  })

  it('does NOT prepend system message when transcript is null/undefined', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'a' } }] })
    )
    restore = m.restore
    await chat(baseInput('openai'))
    const body = JSON.parse((m.calls[0].init?.body as string) ?? '{}')
    expect(body.messages[0].role).toBe('user')
  })

  it.each([
    ['openai' as const, (status: number) => jsonResponse(status, { error: 'unauthorized' })],
    ['anthropic' as const, (status: number) => jsonResponse(status, { error: 'unauthorized' })],
    ['groq' as const, (status: number) => jsonResponse(status, { error: 'unauthorized' })],
  ])('maps 401 from %s to invalid_api_key', async (provider, makeResp) => {
    const m = mockFetch(() => makeResp(401))
    restore = m.restore
    const err = await chat(baseInput(provider)).catch((e: unknown) => e)
    expect(isChatError(err)).toBe(true)
    expect((err as ChatError).code).toBe('invalid_api_key')
  })

  it.each([
    ['openai' as const],
    ['anthropic' as const],
    ['groq' as const],
  ])('maps network failure from %s to network', async (provider) => {
    const m = mockFetch(() => {
      throw new TypeError('Network request failed')
    })
    restore = m.restore
    const err = await chat(baseInput(provider)).catch((e: unknown) => e)
    expect(isChatError(err)).toBe(true)
    expect((err as ChatError).code).toBe('network')
  })

  it('maps 429 with retry-after to rate_limit', async () => {
    const m = mockFetch(() =>
      jsonResponse(429, { error: 'rate_limit' }, { 'retry-after': '5' })
    )
    restore = m.restore
    const err = await chat(baseInput('openai')).catch((e: unknown) => e)
    expect(isChatError(err)).toBe(true)
    expect((err as ChatError).code).toBe('rate_limit')
    expect((err as ChatError).retryAfterSeconds).toBe(5)
  })

  it('maps non-2xx with body to provider_error', async () => {
    const m = mockFetch(() => textResponse(500, 'internal'))
    restore = m.restore
    const err = await chat(baseInput('openai')).catch((e: unknown) => e)
    expect((err as ChatError).code).toBe('provider_error')
    expect((err as ChatError).status).toBe(500)
  })

  it('maps 200-empty-content to invalid_response', async () => {
    const m = mockFetch(() => jsonResponse(200, { choices: [{ message: { content: '' } }] }))
    restore = m.restore
    const err = await chat(baseInput('openai')).catch((e: unknown) => e)
    expect((err as ChatError).code).toBe('invalid_response')
  })

  it('uses default model when none provided', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'a' } }] })
    )
    restore = m.restore
    await chat(baseInput('openai'))
    const body = JSON.parse((m.calls[0].init?.body as string) ?? '{}')
    expect(body.model).toBe('gpt-4o-mini')
  })

  it('respects explicit model override', async () => {
    const m = mockFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'a' } }] })
    )
    restore = m.restore
    await chat({ ...baseInput('openai'), model: 'gpt-4.1' })
    const body = JSON.parse((m.calls[0].init?.body as string) ?? '{}')
    expect(body.model).toBe('gpt-4.1')
  })
})
