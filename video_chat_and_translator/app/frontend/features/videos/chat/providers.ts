import type { ChatProvider } from './types'

export function providerLabel(provider: ChatProvider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI'
    case 'anthropic':
      return 'Anthropic'
    case 'groq':
      return 'Groq'
  }
}

export function providerBaseUrl(provider: ChatProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com'
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'groq':
      return 'https://api.groq.com'
  }
}

export function providerDefaultModel(provider: ChatProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini'
    case 'anthropic':
      return 'claude-3-5-haiku-latest'
    case 'groq':
      return 'llama-3.1-8b-instant'
  }
}

export const ALL_PROVIDERS: ChatProvider[] = ['openai', 'anthropic', 'groq']
