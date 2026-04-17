import { TranscriptionError, type TranscriptionProvider } from './errors'
import { assertWithinProviderLimit, providerBaseUrl, providerTranscriptionPath } from './providers'

export type TranscriptionUploadProgressPhase = 'uploading' | 'awaiting_response'

export interface TranscriptionUploadProgress {
  phase: TranscriptionUploadProgressPhase
  loaded: number
  total: number
}

export interface TranscribeToVttParams {
  provider: TranscriptionProvider
  apiKey: string
  videoFile: File
  model: string
  language?: string
  /** Сценарий B: прогресс отправки multipart-тела (fetch этого не даёт). */
  onUploadProgress?: (progress: TranscriptionUploadProgress) => void
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

function postMultipartTranscription(params: {
  url: string
  bearerToken: string
  form: FormData
  videoFile: File
  onUploadProgress?: TranscribeToVttParams['onUploadProgress']
}): Promise<{ status: number; bodyText: string }> {
  const { url, bearerToken, form, videoFile, onUploadProgress } = params

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${bearerToken}`)
    xhr.responseType = 'text'

    xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
      if (!onUploadProgress) return
      const denom =
        e.lengthComputable && e.total > 0
          ? e.total
          : videoFile.size > 0
            ? videoFile.size
            : Math.max(e.loaded, 1)
      onUploadProgress({ phase: 'uploading', loaded: e.loaded, total: denom })
    })

    xhr.upload.addEventListener('load', () => {
      const size = videoFile.size > 0 ? videoFile.size : 1
      onUploadProgress?.({ phase: 'awaiting_response', loaded: size, total: size })
    })

    xhr.addEventListener('error', () => {
      reject(new TypeError('Network request failed'))
    })

    xhr.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 0) {
        reject(new TypeError('Network request failed'))
        return
      }
      const bodyText = typeof xhr.response === 'string' ? xhr.response : xhr.responseText
      resolve({ status: xhr.status, bodyText })
    })

    xhr.send(form)
  })
}

export async function transcribeToVtt(params: TranscribeToVttParams): Promise<string> {
  const { provider, apiKey, videoFile, model, language, onUploadProgress } = params

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
    const { status, bodyText } = await postMultipartTranscription({
      url,
      bearerToken: apiKey,
      form,
      videoFile,
      onUploadProgress,
    })

    if (!status || status < 200 || status >= 300) {
      throw normalizeHttpError(provider, status, bodyText)
    }

    const trimmed = bodyText.trim()
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
