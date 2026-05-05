import type { ChatProvider } from './types'

export type ChatErrorCode =
  | 'invalid_api_key'
  | 'network'
  | 'rate_limit'
  | 'provider_error'
  | 'invalid_response'
  | 'unknown'

export class ChatError extends Error {
  readonly code: ChatErrorCode
  readonly provider: ChatProvider
  readonly status?: number
  readonly retryAfterSeconds?: number

  constructor(params: {
    message: string
    code: ChatErrorCode
    provider: ChatProvider
    status?: number
    retryAfterSeconds?: number
  }) {
    super(params.message)
    this.name = 'ChatError'
    this.code = params.code
    this.provider = params.provider
    this.status = params.status
    this.retryAfterSeconds = params.retryAfterSeconds
  }
}

export function isChatError(err: unknown): err is ChatError {
  return err instanceof ChatError
}
