import { TranscriptionError, type TranscriptionProvider } from './errors'

export function providerLabel(provider: TranscriptionProvider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI'
    case 'groq':
      return 'Groq'
  }
}

export function providerBaseUrl(provider: TranscriptionProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com'
    case 'groq':
      return 'https://api.groq.com'
  }
}

export function providerTranscriptionPath(provider: TranscriptionProvider): string {
  switch (provider) {
    case 'openai':
      return '/v1/audio/transcriptions'
    case 'groq':
      return '/openai/v1/audio/transcriptions'
  }
}

export function providerDefaultModel(provider: TranscriptionProvider): string {
  switch (provider) {
    case 'openai':
      return 'whisper-1'
    case 'groq':
      return 'whisper-large-v3'
  }
}

export function providerMaxBytes(provider: TranscriptionProvider): number {
  // Provider limits may change; we keep conservative defaults for preflight.
  switch (provider) {
    case 'openai':
      return 25 * 1024 * 1024
    case 'groq':
      return 25 * 1024 * 1024
  }
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = bytes / 1024
  if (kb >= 1) return `${kb.toFixed(0)} KB`
  return `${bytes} B`
}

export function assertWithinProviderLimit(provider: TranscriptionProvider, file: File) {
  const max = providerMaxBytes(provider)
  if (file.size <= max) return
  throw new TranscriptionError({
    provider,
    code: 'file_too_large',
    message: `Файл слишком большой для ${providerLabel(provider)}: ${formatBytes(file.size)} (лимит ~${formatBytes(max)}).`,
  })
}

