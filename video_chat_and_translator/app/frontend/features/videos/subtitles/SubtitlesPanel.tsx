import type { Segment } from './vtt'

interface SubtitlesPanelProps {
  activeIndex: number | null
  errorMessage?: string
  isOpen: boolean
  onToggle: () => void
  segments: Segment[]
  status: 'loading' | 'empty' | 'error' | 'ready'
}

function formatTimestamp(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const secs = wholeSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function SubtitlesPanel({
  activeIndex,
  errorMessage,
  isOpen,
  onToggle,
  segments,
  status,
}: SubtitlesPanelProps) {
  return (
    <aside
      className={[
        'rounded-2xl border border-gray-200 bg-white shadow-sm transition-all',
        isOpen ? 'lg:w-[22rem]' : 'lg:w-52',
      ].join(' ')}
      data-subtitles-panel
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Субтитры</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Текст из VTT показывается рядом с видео и синхронизируется с текущим временем.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="subtitles-panel-content"
          className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
        >
          {isOpen ? 'Скрыть панель' : 'Показать субтитры'}
        </button>
      </div>

      {isOpen && (
        <div id="subtitles-panel-content" className="border-t border-gray-100 p-4 pt-3">
          {status === 'loading' && (
            <p className="text-sm text-gray-500">Читаем сохранённые субтитры…</p>
          )}

          {status === 'empty' && (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
              Субтитры не загружены.
            </p>
          )}

          {status === 'error' && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm leading-relaxed text-red-700"
            >
              {errorMessage ?? 'Не удалось разобрать сохранённые субтитры.'}
            </p>
          )}

          {status === 'ready' && (
            <ol className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {segments.map((segment, index) => {
                const isActive = activeIndex === index

                return (
                  <li
                    key={`${segment.start}-${segment.end}-${index}`}
                    data-subtitles-segment-index={index}
                    data-active={isActive ? 'true' : 'false'}
                    className={[
                      'rounded-xl border px-3 py-2 transition-colors',
                      isActive
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
                        : 'border-gray-200 bg-gray-50 text-gray-700',
                    ].join(' ')}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{segment.text}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </aside>
  )
}
