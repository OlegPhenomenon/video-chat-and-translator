import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { chat } from './client'
import { extractTranscriptText } from './context'
import { ALL_PROVIDERS, providerDefaultModel, providerLabel } from './providers'
import { appendMessage, clearMessages, getMessages, setMessages } from './storage'
import { ChatError, isChatError } from './errors'
import type { ChatMessage, ChatProvider } from './types'

interface ChatPanelProps {
  videoId: string
  subtitlesFile: File | null | undefined
}

interface SendError {
  forUserMessageIndex: number
  message: string
}

function apiKeyStorageKey(provider: ChatProvider): string {
  return `ft-020:chat_api_key:${provider}`
}

function readStoredApiKey(provider: ChatProvider): string {
  try {
    return window.localStorage.getItem(apiKeyStorageKey(provider)) ?? ''
  } catch {
    return ''
  }
}

function persistApiKey(provider: ChatProvider, value: string, remember: boolean): void {
  try {
    if (remember && value.trim()) {
      window.localStorage.setItem(apiKeyStorageKey(provider), value)
    } else {
      window.localStorage.removeItem(apiKeyStorageKey(provider))
    }
  } catch {
    // localStorage может быть отключён — silently игнорируем.
  }
}

function describeError(err: unknown): string {
  if (isChatError(err)) return err.message
  if (err instanceof Error) return err.message
  return 'Неизвестная ошибка.'
}

export function ChatPanel({ videoId, subtitlesFile }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [provider, setProvider] = useState<ChatProvider>('openai')
  const [model, setModel] = useState<string>(providerDefaultModel('openai'))
  const [apiKey, setApiKey] = useState<string>('')
  const [rememberKey, setRememberKey] = useState<boolean>(false)
  const [includeTranscript, setIncludeTranscript] = useState<boolean>(true)
  const [busy, setBusy] = useState<boolean>(false)
  const [sendError, setSendError] = useState<SendError | null>(null)
  const [storageDegraded, setStorageDegraded] = useState<boolean>(false)
  const transcriptRef = useRef<string | null>(null)
  const transcriptForFileRef = useRef<File | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  const hasTranscript = Boolean(subtitlesFile)

  // Load history on mount / video change.
  useEffect(() => {
    let cancelled = false
    getMessages(videoId)
      .then((messages) => {
        if (cancelled) return
        setHistory(messages)
      })
      .catch(() => {
        if (cancelled) return
        setStorageDegraded(true)
      })
    return () => {
      cancelled = true
    }
  }, [videoId])

  // Reset transient state when video changes.
  useEffect(() => {
    setDraft('')
    setSendError(null)
    setBusy(false)
  }, [videoId])

  // Re-read stored api-key when provider switches.
  useEffect(() => {
    const stored = readStoredApiKey(provider)
    if (stored) {
      setApiKey(stored)
      setRememberKey(true)
    } else {
      setApiKey('')
      setRememberKey(false)
    }
    setModel(providerDefaultModel(provider))
  }, [provider])

  // Persist api-key changes.
  useEffect(() => {
    persistApiKey(provider, apiKey, rememberKey)
  }, [provider, apiKey, rememberKey])

  // Auto-scroll to bottom on new messages. Guard against jsdom (no scrollIntoView).
  useEffect(() => {
    const el = listEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'auto', block: 'end' })
    }
  }, [history.length])

  const sendDisabled = useMemo(() => busy || !draft.trim() || !apiKey.trim(), [busy, draft, apiKey])

  async function ensureTranscript(): Promise<string | null> {
    if (!includeTranscript) return null
    if (!subtitlesFile) return null
    if (transcriptForFileRef.current === subtitlesFile && transcriptRef.current !== null) {
      return transcriptRef.current
    }
    const text = await extractTranscriptText(subtitlesFile)
    transcriptRef.current = text
    transcriptForFileRef.current = subtitlesFile
    return text
  }

  async function handleSend(text: string, retryForIndex?: number): Promise<void> {
    if (busy) return
    const trimmed = text.trim()
    if (!trimmed) return

    setBusy(true)
    setSendError(null)

    const userMessage: ChatMessage = { role: 'user', content: trimmed }

    let nextHistory: ChatMessage[]
    let userIndex: number

    if (retryForIndex !== undefined) {
      // Retry: keep history as is, do not append a new user message.
      nextHistory = history
      userIndex = retryForIndex
    } else {
      nextHistory = [...history, userMessage]
      userIndex = nextHistory.length - 1
      setHistory(nextHistory)
      setDraft('')
      try {
        await appendMessage(videoId, userMessage)
      } catch {
        setStorageDegraded(true)
      }
    }

    try {
      const transcript = await ensureTranscript()
      const response = await chat({
        provider,
        apiKey,
        model: model.trim() || undefined,
        messages: nextHistory,
        transcript,
      })

      const finalHistory = [...nextHistory, response.message]
      setHistory(finalHistory)
      try {
        await setMessages(videoId, finalHistory)
      } catch {
        setStorageDegraded(true)
      }
    } catch (err) {
      setSendError({ forUserMessageIndex: userIndex, message: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void handleSend(draft)
  }

  function onTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend(draft)
    }
  }

  async function handleClear() {
    setHistory([])
    setSendError(null)
    try {
      await clearMessages(videoId)
    } catch {
      setStorageDegraded(true)
    }
  }

  function handleRetry() {
    if (sendError === null) return
    const lastUser = history[sendError.forUserMessageIndex]
    if (!lastUser || lastUser.role !== 'user') {
      setSendError(null)
      return
    }
    void handleSend(lastUser.content, sendError.forUserMessageIndex)
  }

  return (
    <aside
      className={[
        'rounded-2xl border border-gray-200 bg-white shadow-sm transition-all',
        isOpen ? 'xl:w-[26rem]' : 'xl:w-52',
      ].join(' ')}
      data-chat-panel
      data-chat-provider={provider}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Чат с видео</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Задайте вопрос по содержимому видео. Запросы идут напрямую от браузера к выбранному провайдеру.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="chat-panel-content"
          className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
        >
          {isOpen ? 'Скрыть чат' : 'Показать чат'}
        </button>
      </div>

      {isOpen && (
        <div id="chat-panel-content" className="border-t border-gray-100 p-4 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Провайдер</span>
              <select
                value={provider}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setProvider(e.target.value as ChatProvider)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                data-chat-provider-select
              >
                {ALL_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {providerLabel(p)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">Модель</span>
              <input
                value={model}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder={providerDefaultModel(provider)}
              />
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className="font-medium text-gray-700">API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={`API key для ${providerLabel(provider)}`}
              autoComplete="off"
            />
          </label>

          <div className="mt-3 flex flex-col gap-2 text-sm text-gray-700">
            <label className="inline-flex items-start gap-2">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberKey(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Запомнить ключ в этом браузере (localStorage). Ключ не отправляется на Rails-сервер.</span>
            </label>

            <label className="inline-flex items-start gap-2">
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setIncludeTranscript(e.target.checked)}
                disabled={!hasTranscript}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              <span>
                {hasTranscript ? 'Контекст транскрипта подключён' : 'Контекст транскрипта недоступен (нет VTT)'}
              </span>
            </label>
          </div>

          {storageDegraded && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              История сообщений не сохраняется в этом браузере (IndexedDB недоступен).
            </p>
          )}

          <div className="mt-4 flex max-h-[24rem] min-h-[10rem] flex-col gap-2 overflow-y-auto pr-1" data-chat-history>
            {history.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                Задайте вопрос по содержимому видео.
              </p>
            )}
            {history.map((m, i) => {
              const isUser = m.role === 'user'
              const errored = sendError?.forUserMessageIndex === i
              return (
                <div
                  key={i}
                  data-chat-message-role={m.role}
                  className={[
                    'rounded-xl px-3 py-2 text-sm leading-relaxed',
                    isUser ? 'self-end bg-indigo-600 text-white' : 'self-start bg-gray-100 text-gray-900',
                  ].join(' ')}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                  {errored && sendError && (
                    <div
                      role="alert"
                      data-chat-error
                      className="mt-2 rounded-md bg-red-100 px-2 py-1 text-xs text-red-800"
                    >
                      <p>{sendError.message}</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={busy}
                        className="mt-1 rounded border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-200 disabled:opacity-60"
                      >
                        Повторить
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={listEndRef} />
          </div>

          <form onSubmit={onSubmit} className="mt-3">
            <textarea
              value={draft}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              rows={2}
              className="block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Введите вопрос (Enter — отправить, Shift+Enter — новая строка)"
              data-chat-input
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={busy || history.length === 0}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                Очистить чат
              </button>
              <button
                type="submit"
                disabled={sendDisabled}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                data-chat-send
              >
                {busy ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  )
}

// Re-export ChatError for tests / consumers that want narrowed catches.
export { ChatError }
