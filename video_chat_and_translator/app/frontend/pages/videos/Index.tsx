import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import { StorageError, StoredVideoRecord, listVideos, saveVideo } from '../../features/videos/storage'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ListState =
  | { status: 'loading' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }
  | { status: 'ready'; videos: StoredVideoRecord[] }

type SaveState = 'idle' | 'saving'

export default function VideosIndex() {
  const [listState, setListState] = useState<ListState>({ status: 'loading' })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listVideos()
      .then((videos) => setListState({ status: 'ready', videos }))
      .catch((err: unknown) => {
        if (err instanceof StorageError && err.code === 'unsupported') {
          setListState({ status: 'unsupported' })
        } else {
          setListState({ status: 'error', message: 'Не удалось загрузить список видео.' })
        }
      })
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    e.target.value = ''

    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setSaveError('Выбранный файл не является видео. Пожалуйста, выберите видеофайл.')
      return
    }

    setSaveError(null)
    setSaveState('saving')

    try {
      const record = await saveVideo(file)
      router.visit(`/videos/${record.id}`)
    } catch (err: unknown) {
      setSaveState('idle')
      if (err instanceof StorageError && err.code === 'quota_exceeded') {
        setSaveError('Недостаточно места для сохранения видео. Освободите место в браузере и попробуйте снова.')
      } else {
        setSaveError('Не удалось сохранить видео. Попробуйте ещё раз.')
      }
    }
  }

  const inputDisabled = saveState === 'saving' || listState.status === 'unsupported'

  return (
    <>
      <Head title="Видеотека" />
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Видеотека</h1>

          {listState.status === 'unsupported' ? (
            <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-yellow-800">
              Ваш браузер не поддерживает локальное хранилище. Загрузка видео недоступна.
            </div>
          ) : (
            <div className="mb-8">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Загрузить видео
              </label>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                disabled={inputDisabled}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {saveState === 'saving' && (
                <p className="mt-2 text-sm text-gray-500">Сохранение...</p>
              )}
              {saveError && (
                <p className="mt-2 text-sm text-red-600">{saveError}</p>
              )}
            </div>
          )}

          {listState.status === 'loading' && (
            <p className="text-gray-500">Загрузка...</p>
          )}

          {listState.status === 'error' && (
            <p className="text-red-600">{listState.message}</p>
          )}

          {listState.status === 'ready' && listState.videos.length === 0 && (
            <p className="text-gray-500">Нет загруженных видео. Выберите файл выше, чтобы начать.</p>
          )}

          {listState.status === 'ready' && listState.videos.length > 0 && (
            <ul className="space-y-3">
              {listState.videos.map((video) => (
                <li key={video.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{video.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatSize(video.size)} · {formatDate(video.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/videos/${video.id}`}
                    className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Смотреть
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
