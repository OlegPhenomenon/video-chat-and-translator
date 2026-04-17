import { Head, Link, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { StorageError, StoredVideoRecord, findVideo, setSubtitles } from '@/features/videos/storage'
import {
  isTranscriptionError,
  providerDefaultModel,
  providerLabel,
  transcribeToVtt,
  type TranscriptionProvider,
  type TranscriptionUploadProgress,
} from '@/features/videos/transcription'

interface PageProps {
  id: string
  [key: string]: unknown
}

type VideoState =
  | { status: 'loading' }
  | { status: 'success'; record: StoredVideoRecord; objectURL: string; subtitlesURL: string | null }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

type TranscriptionStage = 'idle' | 'preparing' | 'processing' | 'saving' | 'success' | 'error' | 'validation_failed'

function transcriptionStageLabel(stage: TranscriptionStage): string {
  switch (stage) {
    case 'idle':
      return 'Ожидание'
    case 'preparing':
      return 'Подготовка запроса'
    case 'processing':
      return 'Отправка и распознавание'
    case 'saving':
      return 'Сохранение субтитров'
    case 'success':
      return 'Готово'
    case 'validation_failed':
      return 'Нужно действие'
    case 'error':
      return 'Ошибка'
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${mm}:${ss}`
}

function formatUploadDetail(progress: TranscriptionUploadProgress): string {
  if (progress.phase === 'awaiting_response') return 'Получаем ответ от провайдера…'
  const pct = Math.min(100, Math.round((100 * progress.loaded) / Math.max(progress.total, 1)))
  return `Отправка файла на сервер: ${pct}%`
}

function TranscriptionSpinner() {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"
      aria-hidden
    />
  )
}

function transcriptionErrorMessage(err: unknown): string {
  if (!isTranscriptionError(err)) return 'Не удалось выполнить транскрибацию.'

  switch (err.code) {
    case 'invalid_api_key':
      return 'Проверьте API key и попробуйте ещё раз.'
    case 'network':
      return 'Не удалось выполнить запрос к провайдеру. Возможны проблемы сети или CORS (запрос выполняется напрямую из браузера).'
    case 'file_too_large':
      return err.message
    case 'invalid_response':
      return 'Провайдер вернул некорректный ответ. Попробуйте другую модель/провайдера или повторите попытку позже.'
    case 'provider_error':
      return err.message
    case 'unknown':
      return err.message || 'Неизвестная ошибка.'
  }
}

export default function VideosShow() {
  const { id } = usePage<PageProps>().props
  const [state, setState] = useState<VideoState>({ status: 'loading' })
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const [subtitlesError, setSubtitlesError] = useState<string | null>(null)
  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('openai')
  const [transcriptionModel, setTranscriptionModel] = useState<string>(providerDefaultModel('openai'))
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>('')
  const [transcriptionApiKey, setTranscriptionApiKey] = useState<string>('')
  const [rememberApiKey, setRememberApiKey] = useState<boolean>(false)
  const [overwriteSubtitles, setOverwriteSubtitles] = useState<boolean>(false)
  const [transcriptionStage, setTranscriptionStage] = useState<TranscriptionStage>('idle')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [transcriptionStartedAtMs, setTranscriptionStartedAtMs] = useState<number | null>(null)
  const [transcriptionElapsedMs, setTranscriptionElapsedMs] = useState<number>(0)
  const [transcriptionUploadProgress, setTranscriptionUploadProgress] = useState<TranscriptionUploadProgress | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const hasSubtitles = useMemo(() => state.status === 'success' && Boolean(state.record.subtitles), [state])
  const transcriptionIsInProgress = transcriptionStage === 'preparing' || transcriptionStage === 'processing' || transcriptionStage === 'saving'

  useEffect(() => {
    setSubtitlesEnabled(false)
    setSubtitlesError(null)
    setOverwriteSubtitles(false)
    setTranscriptionStage('idle')
    setTranscriptionError(null)
    setTranscriptionStartedAtMs(null)
    setTranscriptionElapsedMs(0)
    setTranscriptionUploadProgress(null)
  }, [id])

  useEffect(() => {
    const key = `ft-017:transcription_api_key:${transcriptionProvider}`
    const stored = window.localStorage.getItem(key)
    if (stored) {
      setTranscriptionApiKey(stored)
      setRememberApiKey(true)
    } else {
      setRememberApiKey(false)
    }
    setTranscriptionModel(providerDefaultModel(transcriptionProvider))
    setTranscriptionError(null)
    setTranscriptionStage('idle')
    setTranscriptionStartedAtMs(null)
    setTranscriptionElapsedMs(0)
    setTranscriptionUploadProgress(null)
  }, [transcriptionProvider])

  useEffect(() => {
    if (!transcriptionIsInProgress) return
    if (transcriptionStartedAtMs === null) return

    const tick = () => setTranscriptionElapsedMs(Date.now() - transcriptionStartedAtMs)
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [transcriptionIsInProgress, transcriptionStartedAtMs])

  useEffect(() => {
    const key = `ft-017:transcription_api_key:${transcriptionProvider}`
    if (rememberApiKey) {
      if (transcriptionApiKey.trim()) window.localStorage.setItem(key, transcriptionApiKey)
    } else {
      window.localStorage.removeItem(key)
    }
  }, [rememberApiKey, transcriptionApiKey, transcriptionProvider])

  useEffect(() => {
    let cancelled = false
    let objectURL: string | null = null
    let subtitlesURL: string | null = null

    findVideo(id)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          setState({ status: 'not_found' })
          return
        }
        objectURL = URL.createObjectURL(record.file)
        subtitlesURL = record.subtitles ? URL.createObjectURL(record.subtitles) : null
        setState({ status: 'success', record, objectURL, subtitlesURL })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof StorageError
            ? err.message
            : 'Не удалось загрузить видео.'
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
      if (subtitlesURL) URL.revokeObjectURL(subtitlesURL)
    }
  }, [id])

  useEffect(() => {
    if (state.status !== 'success') return
    if (!state.subtitlesURL) return

    const video = videoRef.current
    if (!video) return

    const applyMode = () => {
      if (!video.textTracks || video.textTracks.length === 0) return
      for (const track of Array.from(video.textTracks) as TextTrack[]) {
        track.mode = subtitlesEnabled ? 'showing' : 'hidden'
      }
    }

    // For some browsers, `textTracks` isn't ready until metadata is loaded.
    applyMode()
    video.addEventListener('loadedmetadata', applyMode)
    return () => video.removeEventListener('loadedmetadata', applyMode)
  }, [state, subtitlesEnabled])

  async function handleSubtitlesChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isVtt = file.name.toLowerCase().endsWith('.vtt')
    if (!isVtt) {
      setSubtitlesError('Поддерживаются только субтитры в формате .vtt.')
      return
    }

    setSubtitlesError(null)

    try {
      const updated = await setSubtitles(id, file)
      if (!updated) {
        setSubtitlesError('Видео не найдено. Возможно, оно было удалено.')
        return
      }

      setState((prev: VideoState) => {
        if (prev.status !== 'success') return prev
        if (prev.subtitlesURL) URL.revokeObjectURL(prev.subtitlesURL)
        const nextSubtitlesURL = updated.subtitles ? URL.createObjectURL(updated.subtitles) : null
        return { ...prev, record: updated, subtitlesURL: nextSubtitlesURL }
      })
    } catch {
      setSubtitlesError('Не удалось сохранить субтитры. Попробуйте ещё раз.')
    }
  }

  async function handleTranscribe() {
    if (state.status !== 'success') return

    // Recovery: repeated click always starts from a clean state.
    setTranscriptionError(null)
    setTranscriptionStage('idle')
    setTranscriptionStartedAtMs(null)
    setTranscriptionElapsedMs(0)
    setTranscriptionUploadProgress(null)

    const hasSubtitlesNow = Boolean(state.record.subtitles)
    if (hasSubtitlesNow && !overwriteSubtitles) {
      setTranscriptionError('У видео уже есть субтитры. Включите “Перезаписать существующие субтитры”, чтобы запустить транскрибацию.')
      setTranscriptionStage('validation_failed')
      return
    }

    const startedAt = Date.now()
    setTranscriptionStartedAtMs(startedAt)
    setTranscriptionStage('preparing')

    try {
      // Give React a chance to paint the "preparing" stage before the network await.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))

      setTranscriptionStage('processing')
      const vtt = await transcribeToVtt({
        provider: transcriptionProvider,
        apiKey: transcriptionApiKey,
        videoFile: state.record.file,
        model: transcriptionModel,
        language: transcriptionLanguage.trim() || undefined,
        onUploadProgress: setTranscriptionUploadProgress,
      })

      setTranscriptionUploadProgress(null)
      setTranscriptionStage('saving')
      const subtitlesFile = new File([vtt], 'subtitles.vtt', { type: 'text/vtt' })
      const updated = await setSubtitles(id, subtitlesFile)
      if (!updated) {
        setTranscriptionError('Видео не найдено. Возможно, оно было удалено.')
        setTranscriptionStage('error')
        return
      }

      setState((prev: VideoState) => {
        if (prev.status !== 'success') return prev
        if (prev.subtitlesURL) URL.revokeObjectURL(prev.subtitlesURL)
        const nextSubtitlesURL = updated.subtitles ? URL.createObjectURL(updated.subtitles) : null
        return { ...prev, record: updated, subtitlesURL: nextSubtitlesURL }
      })

      setTranscriptionStage('success')
      setTranscriptionStartedAtMs(null)
      setTranscriptionElapsedMs(0)
    } catch (err: unknown) {
      setTranscriptionUploadProgress(null)
      const message =
        err instanceof StorageError
          ? 'Не удалось сохранить субтитры в браузере (IndexedDB). Проверьте доступное место и попробуйте ещё раз.'
          : transcriptionErrorMessage(err)
      setTranscriptionError(message)
      setTranscriptionStage('error')
    }
  }

  function downloadSubtitles() {
    if (state.status !== 'success') return
    const file = state.record.subtitles
    if (!file) return

    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name || 'subtitles.vtt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Head title={state.status === 'success' ? state.record.name : 'Видео'} />
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {state.status === 'loading' && (
            <p className="text-gray-500">Загрузка...</p>
          )}

          {state.status === 'not_found' && (
            <div>
              <p className="text-gray-700 mb-4">Видео не найдено. Возможно, оно было удалено или открыто в другом браузере.</p>
              <Link href="/videos" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                ← Вернуться к видеотеке
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <div>
              <p className="text-red-600 mb-4">{state.message}</p>
              <Link href="/videos" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                ← Вернуться к видеотеке
              </Link>
            </div>
          )}

          {state.status === 'success' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <Link href="/videos" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  ← Видеотека
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4 truncate">{state.record.name}</h1>

              <div className="mb-6">
                <label htmlFor="subtitles-upload" className="block mb-2 text-sm font-medium text-gray-700">
                  Субтитры (.vtt)
                </label>
                <input
                  id="subtitles-upload"
                  type="file"
                  accept=".vtt"
                  onChange={handleSubtitlesChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {subtitlesError && (
                  <p className="mt-2 text-sm text-red-600">{subtitlesError}</p>
                )}

                {hasSubtitles && (
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={downloadSubtitles}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Скачать субтитры
                    </button>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={subtitlesEnabled}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSubtitlesEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Субтитры: {subtitlesEnabled ? 'Вкл' : 'Выкл'}
                    </label>
                  </div>
                )}
              </div>

              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Транскрибация (через API)</h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Провайдер</span>
                    <select
                      value={transcriptionProvider}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setTranscriptionProvider(e.target.value as TranscriptionProvider)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="groq">Groq</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Модель</span>
                    <input
                      value={transcriptionModel}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTranscriptionModel(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder={providerDefaultModel(transcriptionProvider)}
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">API key</span>
                    <input
                      value={transcriptionApiKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTranscriptionApiKey(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder={`API key для ${providerLabel(transcriptionProvider)}`}
                      autoComplete="off"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">Язык (опционально)</span>
                    <input
                      value={transcriptionLanguage}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTranscriptionLanguage(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="например: ru, en, uk"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <label className="inline-flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberApiKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberApiKey(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Запомнить ключ в этом браузере (localStorage). Ключ не отправляется на Rails-сервер.
                    </span>
                  </label>

                  {hasSubtitles && (
                    <label className="inline-flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={overwriteSubtitles}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setOverwriteSubtitles(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Перезаписать существующие субтитры</span>
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={handleTranscribe}
                    disabled={transcriptionIsInProgress}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transcriptionIsInProgress ? 'Транскрибация...' : 'Транскрибировать в .vtt'}
                  </button>

                  {transcriptionStage !== 'idle' && (
                    <div
                      className={[
                        'rounded-md border px-3 py-2 text-sm',
                        transcriptionIsInProgress ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : '',
                        transcriptionStage === 'success' ? 'border-green-200 bg-green-50 text-green-800' : '',
                        transcriptionStage === 'validation_failed' ? 'border-amber-200 bg-amber-50 text-amber-900' : '',
                        transcriptionStage === 'error' ? 'border-red-200 bg-red-50 text-red-800' : '',
                      ].join(' ')}
                      role={transcriptionStage === 'error' ? 'alert' : undefined}
                      aria-live={transcriptionIsInProgress ? 'polite' : undefined}
                    >
                      {transcriptionIsInProgress ? (
                        <div className="flex gap-3 items-start">
                          <TranscriptionSpinner />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="font-medium text-indigo-950">Выполняется транскрибация</p>
                            <p className="text-xs leading-relaxed text-indigo-900/90">
                              Транскрибация выполняется на стороне выбранного провайдера и может занять некоторое время.
                              Пожалуйста, подождите — не закрывайте страницу.
                            </p>
                            <p className="text-xs text-indigo-900/80">
                              <span className="font-medium">{transcriptionStageLabel(transcriptionStage)}</span>
                              {transcriptionStartedAtMs !== null && (
                                <span>{` · ${formatElapsed(transcriptionElapsedMs)}`}</span>
                              )}
                            </p>
                            {transcriptionStage === 'processing' && transcriptionUploadProgress && (
                              <p className="text-xs text-indigo-900/85">{formatUploadDetail(transcriptionUploadProgress)}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium">Транскрибация:</span>
                            <span>{transcriptionStageLabel(transcriptionStage)}</span>
                          </div>
                          {transcriptionError && <div className="mt-1">{transcriptionError}</div>}
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Запрос выполняется напрямую из браузера к {providerLabel(transcriptionProvider)}. Возможны ограничения сети/CORS.
                  </p>

                  {transcriptionStage === 'success' && <p className="text-sm text-green-700">Готово: субтитры сохранены.</p>}
                </div>
              </div>

              <video
                ref={videoRef}
                controls
                src={state.objectURL}
                className="w-full rounded-xl border border-gray-200 bg-black"
              >
                {state.subtitlesURL && (
                  <track
                    kind="subtitles"
                    src={state.subtitlesURL}
                    srcLang="ru"
                    label="Subtitles"
                    default={false}
                  />
                )}
              </video>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
