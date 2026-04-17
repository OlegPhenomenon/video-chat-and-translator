import { describe, expect, it, vi } from 'vitest'
import { TranscriptionError, transcribeToVtt, assertWithinProviderLimit } from '@/features/videos/transcription'

describe('FT-017 transcription client', () => {
  it('preflights file size and throws file_too_large', () => {
    const file = new File(['x'], 'video.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 })

    expect(() => assertWithinProviderLimit('openai', file)).toThrow(TranscriptionError)
    try {
      assertWithinProviderLimit('openai', file)
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(TranscriptionError)
      const err = e as TranscriptionError
      expect(err.code).toBe('file_too_large')
    }
  })

  it('normalizes 401/403 as invalid_api_key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('unauthorized'),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      transcribeToVtt({
        provider: 'openai',
        apiKey: 'bad',
        videoFile: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
        model: 'whisper-1',
      })
    ).rejects.toMatchObject({ code: 'invalid_api_key' })
  })

  it('rejects non-vtt response as invalid_response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('hello'),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      transcribeToVtt({
        provider: 'groq',
        apiKey: 'ok',
        videoFile: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
        model: 'whisper-large-v3',
      })
    ).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('returns vtt text and ensures trailing newline', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const vtt = await transcribeToVtt({
      provider: 'openai',
      apiKey: 'ok',
      videoFile: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
      model: 'whisper-1',
    })

    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt.endsWith('\n')).toBe(true)
  })
})

