import { Head, Link, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { StorageError, StoredVideoRecord, findVideo } from '../../features/videos/storage'

interface PageProps {
  id: string
  [key: string]: unknown
}

type VideoState =
  | { status: 'loading' }
  | { status: 'success'; record: StoredVideoRecord; objectURL: string }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

export default function VideosShow() {
  const { id } = usePage<PageProps>().props
  const [state, setState] = useState<VideoState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let objectURL: string | null = null

    findVideo(id)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          setState({ status: 'not_found' })
          return
        }
        objectURL = URL.createObjectURL(record.file)
        setState({ status: 'success', record, objectURL })
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
    }
  }, [id])

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
              <video
                controls
                src={state.objectURL}
                className="w-full rounded-xl border border-gray-200 bg-black"
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
