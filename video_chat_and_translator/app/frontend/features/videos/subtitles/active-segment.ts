import type { Segment } from './vtt'

export function getActiveSegmentIndex(currentTime: number, segments: Segment[]): number | null {
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (segment.start <= currentTime && currentTime < segment.end) return index
  }

  return null
}
