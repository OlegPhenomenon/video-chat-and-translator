import React from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
})

describe('VideosShow subtitles', () => {
  it('shows validation error when non-.vtt is selected', async () => {
    const videoFile = new File(['video'], 'video.mp4', { type: 'video/mp4' })
    findVideo.mockResolvedValue({
      id: 'video-1',
      name: 'video.mp4',
      type: 'video/mp4',
      size: videoFile.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      file: videoFile,
    })

    render(<VideosShow />)

    const input = await screen.findByLabelText('Субтитры (.vtt)')
    const bad = new File(['1'], 'subs.srt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [bad] } })

    expect(await screen.findByText('Поддерживаются только субтитры в формате .vtt.')).toBeInTheDocument()
    expect(setSubtitles).not.toHaveBeenCalled()
  })

  it('shows download + toggle after successful .vtt upload', async () => {
    const videoFile = new File(['video'], 'video.mp4', { type: 'video/mp4' })
    const baseRecord = {
      id: 'video-1',
      name: 'video.mp4',
      type: 'video/mp4',
      size: videoFile.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      file: videoFile,
    }

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
})

