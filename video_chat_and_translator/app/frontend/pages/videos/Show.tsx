import { Head, Link, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { StorageError, StoredVideoRecord, findVideo, setSubtitles } from '../../features/videos/storage'

interface PageProps {
  id: string
  [key: string]: unknown
}

type VideoState =
  | { status: 'loading' }
  | { status: 'success'; record: StoredVideoRecord; objectURL: string; subtitlesURL: string | null }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

export default function VideosShow() {
  const { id } = usePage<PageProps>().props
  const [state, setState] = useState<VideoState>({ status: 'loading' })
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const [subtitlesError, setSubtitlesError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const hasSubtitles = useMemo(() => state.status === 'success' && Boolean(state.record.subtitles), [state])

  useEffect(() => {
    setSubtitlesEnabled(false)
    setSubtitlesError(null)
  }, [id])

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
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Субтитры (.vtt)
                </label>
                <input
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
