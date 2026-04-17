import { TranscriptionError, type TranscriptionProvider } from './errors'
import { assertWithinProviderLimit, providerBaseUrl, providerTranscriptionPath } from './providers'

export interface TranscribeToVttParams {
  provider: TranscriptionProvider
  apiKey: string
  videoFile: File
  model: string
  language?: string
}

function normalizeUnknownError(provider: TranscriptionProvider, err: unknown): TranscriptionError {
  if (err instanceof TranscriptionError) return err
  if (err instanceof TypeError) {
    // Most common fetch error in browsers: network/CORS shows up as TypeError.
    return new TranscriptionError({
      provider,
      code: 'network',
      message:
        'Не удалось выполнить запрос к провайдеру. Возможны проблемы сети или CORS (запрос выполняется напрямую из браузера).',
    })
  }
  const message = err instanceof Error ? err.message : 'Неизвестная ошибка.'
  return new TranscriptionError({ provider, code: 'unknown', message })
}

function normalizeHttpError(provider: TranscriptionProvider, status: number, bodyText: string): TranscriptionError {
  if (status === 401 || status === 403) {
    return new TranscriptionError({
      provider,
      code: 'invalid_api_key',
      status,
      message: 'Неверный API key или доступ запрещён (401/403).',
    })
  }

  if (status === 413) {
    return new TranscriptionError({
      provider,
      code: 'file_too_large',
      status,
      message: 'Файл слишком большой для обработки у провайдера (413).',
    })
  }

  const trimmed = bodyText.trim()
  const suffix = trimmed ? `\n\nОтвет: ${trimmed.slice(0, 500)}` : ''
  return new TranscriptionError({
    provider,
    code: 'provider_error',
    status,
    message: `Ошибка провайдера (${status}).${suffix}`,
  })
}

export async function transcribeToVtt(params: TranscribeToVttParams): Promise<string> {
  const { provider, apiKey, videoFile, model, language } = params

  if (!apiKey.trim()) {
    throw new TranscriptionError({ provider, code: 'invalid_api_key', message: 'API key обязателен.' })
  }

  assertWithinProviderLimit(provider, videoFile)

  const form = new FormData()
  form.append('file', videoFile)
  form.append('model', model)
  form.append('response_format', 'vtt')
  if (language && language.trim()) form.append('language', language.trim())

  const url = `${providerBaseUrl(provider)}${providerTranscriptionPath(provider)}`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    })

    const text = await resp.text()

    if (!resp.ok) {
      throw normalizeHttpError(provider, resp.status, text)
    }

    const trimmed = text.trim()
    if (!trimmed.startsWith('WEBVTT')) {
      throw new TranscriptionError({
        provider,
        code: 'invalid_response',
        message: 'Провайдер вернул ответ, который не похож на валидный .vtt (ожидалось начало "WEBVTT").',
      })
    }

    return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`
  } catch (err: unknown) {
    throw normalizeUnknownError(provider, err)
  }
}

