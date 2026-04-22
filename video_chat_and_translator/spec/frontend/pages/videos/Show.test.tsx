import React from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideosShow from '@/pages/videos/Show'

const findVideo = vi.fn()
const setSubtitles = vi.fn()

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  usePage: () => ({ props: { id: 'video-1' } }),
}))

vi.mock('@/features/videos/storage', () => ({
  StorageError: class StorageError extends Error {},
  findVideo: (...args: unknown[]) => findVideo(...args),
  setSubtitles: (...args: unknown[]) => setSubtitles(...args),
}))

afterEach(() => {
  cleanup()
  findVideo.mockReset()
  setSubtitles.mockReset()
  vi.restoreAllMocks()
})

describe('VideosShow subtitles', () => {
  const createVideoRecord = (overrides: Record<string, unknown> = {}) => {
    const videoFile = new File(['video'], 'video.mp4', { type: 'video/mp4' })

    return {
      id: 'video-1',
      name: 'video.mp4',
      type: 'video/mp4',
      size: videoFile.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      file: videoFile,
      ...overrides,
    }
  }

  beforeEach(() => {
    // Ensure test environment has these browser APIs used by the page.
    if (!('createObjectURL' in URL)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(URL as any).createObjectURL = vi.fn(() => 'blob:mock')
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    }
    if (!('revokeObjectURL' in URL)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(URL as any).revokeObjectURL = vi.fn()
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    }
  })

  it('shows validation error when non-.vtt is selected', async () => {
    findVideo.mockResolvedValue(createVideoRecord())

    render(<VideosShow />)

    const input = await screen.findByLabelText('Субтитры (.vtt)')
    const bad = new File(['1'], 'subs.srt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [bad] } })

    expect(await screen.findByText('Поддерживаются только субтитры в формате .vtt.')).toBeInTheDocument()
    expect(setSubtitles).not.toHaveBeenCalled()
  })

  it('shows download + toggle after successful .vtt upload', async () => {
    const baseRecord = createVideoRecord()
    findVideo.mockResolvedValue(baseRecord)

    const subtitlesFile = new File(['WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'], 'subs.vtt', { type: 'text/vtt' })
    setSubtitles.mockResolvedValue({ ...baseRecord, subtitles: subtitlesFile })

    render(<VideosShow />)

    const input = await screen.findByLabelText('Субтитры (.vtt)')
    fireEvent.change(input, { target: { files: [subtitlesFile] } })

    expect(await screen.findByRole('button', { name: 'Скачать субтитры' })).toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox', { name: /Субтитры:/ })
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('Субтитры: Выкл')).toBeInTheDocument()

    fireEvent.click(checkbox)
    expect(screen.getByText('Субтитры: Вкл')).toBeInTheDocument()
  })

  it('renders parsed subtitles in the side panel and allows collapsing it', async () => {
    const subtitlesFile = new File(
      ['WEBVTT\n\n00:00.000 --> 00:01.000\nПервая строка\n\n00:01.000 --> 00:02.000\nВторая строка\n'],
      'subs.vtt',
      { type: 'text/vtt' }
    )

    findVideo.mockResolvedValue(createVideoRecord({ subtitles: subtitlesFile }))

    render(<VideosShow />)

    expect(await screen.findByText('Первая строка')).toBeInTheDocument()
    expect(screen.getByText('Вторая строка')).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Скрыть панель' })
    fireEvent.click(toggle)

    await waitFor(() => expect(screen.queryByText('Первая строка')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Показать субтитры' })).toBeInTheDocument()
  })

  it('shows empty state when subtitles file is absent', async () => {
    findVideo.mockResolvedValue(createVideoRecord())

    render(<VideosShow />)

    expect(await screen.findByText('Субтитры не загружены.')).toBeInTheDocument()
  })

  it('shows parse error but keeps native track available for toggling', async () => {
    const subtitlesFile = new File(['not-a-valid-vtt'], 'broken.vtt', { type: 'text/vtt' })
    findVideo.mockResolvedValue(createVideoRecord({ subtitles: subtitlesFile }))

    const { container } = render(<VideosShow />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось разобрать сохранённые субтитры')
    expect(container.querySelector('track')).not.toBeNull()

    const checkbox = screen.getByRole('checkbox', { name: /Субтитры:/ })
    fireEvent.click(checkbox)
    expect(screen.getByText('Субтитры: Вкл')).toBeInTheDocument()
  })

  it('marks the active segment when the video time changes', async () => {
    const subtitlesFile = new File(
      ['WEBVTT\n\n00:00.000 --> 00:01.000\nLine one\n\n00:01.000 --> 00:02.500\nLine two\n'],
      'subs.vtt',
      { type: 'text/vtt' }
    )

    findVideo.mockResolvedValue(createVideoRecord({ subtitles: subtitlesFile }))

    const { container } = render(<VideosShow />)

    expect(await screen.findByText('Line one')).toBeInTheDocument()

    const video = container.querySelector('video') as HTMLVideoElement
    let currentTimeValue = 0.5
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTimeValue,
    })

    fireEvent(video, new Event('timeupdate'))
    await waitFor(() =>
      expect(container.querySelector('[data-subtitles-segment-index="0"]')).toHaveAttribute('data-active', 'true')
    )

    currentTimeValue = 1.5
    fireEvent(video, new Event('timeupdate'))
    await waitFor(() =>
      expect(container.querySelector('[data-subtitles-segment-index="1"]')).toHaveAttribute('data-active', 'true')
    )
  })
})
