export interface Segment {
  start: number
  end: number
  text: string
}

export interface ParseError {
  line: number
  reason: string
}

export type ParseStatus = 'ok' | 'partial' | 'invalid'

export interface ParseResult {
  status: ParseStatus
  segments: Segment[]
  errors: ParseError[]
}

const TIMING_LINE_PATTERN =
  /^(?<start>(?:\d{2,}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+(?<end>(?:\d{2,}:)?\d{2}:\d{2}\.\d{3})(?:\s+.*)?$/

function parseTimestamp(raw: string): number | null {
  const parts = raw.split(':')
  if (parts.length !== 2 && parts.length !== 3) return null

  const secondsPart = parts[parts.length - 1]
  const [secondsRaw, millisecondsRaw] = secondsPart.split('.')
  if (!secondsRaw || !millisecondsRaw || millisecondsRaw.length !== 3) return null

  const seconds = Number(secondsRaw)
  const milliseconds = Number(millisecondsRaw)
  if (!Number.isInteger(seconds) || !Number.isInteger(milliseconds)) return null

  if (parts.length === 2) {
    const minutes = Number(parts[0])
    if (!Number.isInteger(minutes)) return null
    return minutes * 60 + seconds + milliseconds / 1000
  }

  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

function stripCueTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}

function finalizeResult(segments: Segment[], errors: ParseError[]): ParseResult {
  if (segments.length === 0 && errors.length > 0) return { status: 'invalid', segments, errors }
  if (errors.length > 0) return { status: 'partial', segments, errors }
  return { status: 'ok', segments, errors }
}

export function parseVtt(vttText: string): ParseResult {
  const normalized = vttText.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length === 0) {
    return { status: 'invalid', segments: [], errors: [{ line: 1, reason: 'Файл субтитров пустой.' }] }
  }

  lines[0] = lines[0].replace(/^\uFEFF/, '')
  if (!/^WEBVTT(?:[ \t].*)?$/.test(lines[0])) {
    return {
      status: 'invalid',
      segments: [],
      errors: [{ line: 1, reason: 'Файл должен начинаться с заголовка WEBVTT.' }],
    }
  }

  const segments: Segment[] = []
  const errors: ParseError[] = []

  let index = 1
  while (index < lines.length && lines[index] !== '') index += 1

  while (index < lines.length) {
    while (index < lines.length && lines[index] === '') index += 1
    if (index >= lines.length) break

    if (lines[index].startsWith('NOTE')) {
      while (index < lines.length && lines[index] !== '') index += 1
      continue
    }

    if (lines[index] === 'STYLE') {
      while (index < lines.length && lines[index] !== '') index += 1
      continue
    }

    const blockStartLine = index + 1
    let timingLine = lines[index]
    let timingLineNumber = index + 1

    if (!timingLine.includes('-->')) {
      if (index + 1 < lines.length && lines[index + 1].includes('-->')) {
        index += 1
        timingLine = lines[index]
        timingLineNumber = index + 1
      } else {
        errors.push({ line: blockStartLine, reason: 'Ожидалась строка таймкода cue.' })
        while (index < lines.length && lines[index] !== '') index += 1
        continue
      }
    }

    const match = timingLine.match(TIMING_LINE_PATTERN)
    if (!match?.groups?.start || !match.groups.end) {
      errors.push({ line: timingLineNumber, reason: 'Некорректная строка таймкода cue.' })
      while (index < lines.length && lines[index] !== '') index += 1
      continue
    }

    const start = parseTimestamp(match.groups.start)
    const end = parseTimestamp(match.groups.end)
    if (start === null || end === null) {
      errors.push({ line: timingLineNumber, reason: 'Некорректный формат таймкода cue.' })
      while (index < lines.length && lines[index] !== '') index += 1
      continue
    }

    if (end <= start) {
      errors.push({ line: timingLineNumber, reason: 'Конец cue должен быть позже начала.' })
      while (index < lines.length && lines[index] !== '') index += 1
      continue
    }

    index += 1
    const textLines: string[] = []
    while (index < lines.length && lines[index] !== '') {
      textLines.push(lines[index])
      index += 1
    }

    const text = textLines.map(stripCueTags).join('\n').trim()
    if (!text) {
      errors.push({ line: timingLineNumber, reason: 'Cue не содержит читаемого текста.' })
      continue
    }

    segments.push({ start, end, text })
  }

  return finalizeResult(segments, errors)
}
