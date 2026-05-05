import { parseVtt } from '../subtitles'

/**
 * Maximum chars of transcript text we send to LLMs as context.
 * Conservative cap so we fit comfortably in 4o-mini / haiku / 8b-instant context windows.
 * If exceeded, we keep the *tail* of the transcript (most recent statements first).
 */
export const MAX_CONTEXT_CHARS = 80000

export const TRUNCATION_NOTICE_PREFIX = '[transcript truncated, last %d chars of %d]\n\n'

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл.'))
    reader.readAsText(file)
  })
}

/**
 * Extract plain transcript text from a VTT file (no timestamps, no cue identifiers).
 * Returns null if file is missing or VTT is invalid (per CTR-03).
 * Applies truncation per FM-03 — keeps the tail and prepends a notice.
 */
export async function extractTranscriptText(file: File | null | undefined): Promise<string | null> {
  if (!file) return null

  let raw: string
  try {
    raw = await readFileText(file)
  } catch {
    return null
  }

  const parsed = parseVtt(raw)
  if (parsed.status === 'invalid') return null
  if (parsed.segments.length === 0) return null

  const text = parsed.segments
    .map((s) => s.text.trim())
    .filter((t) => t.length > 0)
    .join('\n')

  if (text.length === 0) return null

  if (text.length <= MAX_CONTEXT_CHARS) return text

  const tail = text.slice(text.length - MAX_CONTEXT_CHARS)
  const notice = TRUNCATION_NOTICE_PREFIX.replace('%d', String(MAX_CONTEXT_CHARS)).replace('%d', String(text.length))
  return `${notice}${tail}`
}
