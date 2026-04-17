import { describe, expect, it, vi } from 'vitest'
import { TranscriptionError, transcribeToVtt, assertWithinProviderLimit } from '@/features/videos/transcription'

type XHRListener = (ev?: unknown) => void

class MockXMLHttpRequest {
  method = ''
  url = ''
  status = 0
  responseText = ''
  responseType = ''
  private readonly uploadListeners: Record<string, XHRListener[]> = { progress: [], load: [] }
  private readonly listeners: Record<string, XHRListener[]> = { load: [], error: [], abort: [] }

  upload: { addEventListener: (type: string, fn: XHRListener) => void }

  constructor() {
    this.upload = {
      addEventListener: (type: string, fn: XHRListener) => {
        if (!this.uploadListeners[type]) this.uploadListeners[type] = []
        this.uploadListeners[type].push(fn)
      },
    }
  }

  addEventListener(type: string, fn: XHRListener) {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push(fn)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(_name: string, _value: string) {}

  send(_body?: unknown) {
    // overridden in subclasses
  }

  emitUploadProgress(e: Partial<ProgressEvent> & { loaded: number; total: number }) {
    this.uploadListeners.progress.forEach((fn) => fn(e as ProgressEvent))
  }

  emitUploadLoad() {
    this.uploadListeners.load.forEach((fn) => fn())
  }

  emitLoad() {
    this.listeners.load.forEach((fn) => fn())
  }

  emitError() {
    this.listeners.error.forEach((fn) => fn())
  }
}

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
    class XHR401 extends MockXMLHttpRequest {
      override send() {
        queueMicrotask(() => {
          this.emitUploadProgress({ lengthComputable: true, loaded: 10, total: 100 })
          queueMicrotask(() => {
            this.emitUploadProgress({ lengthComputable: true, loaded: 100, total: 100 })
            this.emitUploadLoad()
            this.status = 401
            this.responseText = 'unauthorized'
            this.emitLoad()
          })
        })
      }
    }
    vi.stubGlobal('XMLHttpRequest', XHR401)

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
    class XHRBadBody extends MockXMLHttpRequest {
      override send() {
        queueMicrotask(() => {
          this.emitUploadProgress({ lengthComputable: true, loaded: 100, total: 100 })
          this.emitUploadLoad()
          this.status = 200
          this.responseText = 'hello'
          this.emitLoad()
        })
      }
    }
    vi.stubGlobal('XMLHttpRequest', XHRBadBody)

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
    class XHROk extends MockXMLHttpRequest {
      override send() {
        queueMicrotask(() => {
          this.emitUploadProgress({ lengthComputable: true, loaded: 100, total: 100 })
          this.emitUploadLoad()
          this.status = 200
          this.responseText = 'WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'
          this.emitLoad()
        })
      }
    }
    vi.stubGlobal('XMLHttpRequest', XHROk)

    const vtt = await transcribeToVtt({
      provider: 'openai',
      apiKey: 'ok',
      videoFile: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
      model: 'whisper-1',
    })

    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt.endsWith('\n')).toBe(true)
  })

  it('reports upload phases via onUploadProgress', async () => {
    const phases: string[] = []

    class XHRSlow extends MockXMLHttpRequest {
      override send() {
        queueMicrotask(() => {
          this.emitUploadProgress({ lengthComputable: true, loaded: 30, total: 100 })
          queueMicrotask(() => {
            this.emitUploadProgress({ lengthComputable: true, loaded: 100, total: 100 })
            this.emitUploadLoad()
            this.status = 200
            this.responseText = 'WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'
            this.emitLoad()
          })
        })
      }
    }
    vi.stubGlobal('XMLHttpRequest', XHRSlow)

    await transcribeToVtt({
      provider: 'openai',
      apiKey: 'ok',
      videoFile: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
      model: 'whisper-1',
      onUploadProgress: (p) => {
        phases.push(p.phase)
      },
    })

    expect(phases).toContain('uploading')
    expect(phases).toContain('awaiting_response')
  })
})
