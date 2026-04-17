export type TranscriptionProvider = 'openai' | 'groq'

export type TranscriptionErrorCode =
  | 'file_too_large'
  | 'invalid_api_key'
  | 'network'
  | 'provider_error'
  | 'invalid_response'
  | 'unknown'

export class TranscriptionError extends Error {
  readonly code: TranscriptionErrorCode
  readonly provider: TranscriptionProvider
  readonly status?: number

  constructor(params: { message: string; code: TranscriptionErrorCode; provider: TranscriptionProvider; status?: number }) {
    super(params.message)
    this.name = 'TranscriptionError'
    this.code = params.code
    this.provider = params.provider
    this.status = params.status
  }
}

export function isTranscriptionError(err: unknown): err is TranscriptionError {
  return err instanceof TranscriptionError
}

