import { describe, expect, it } from 'vitest'
import { getActiveSegmentIndex, type Segment } from '@/features/videos/subtitles'

const segments: Segment[] = [
  { start: 0, end: 1, text: 'First' },
  { start: 1, end: 2.5, text: 'Second' },
]

describe('FT-019 active segment selection', () => {
  it('returns null for empty input', () => {
    expect(getActiveSegmentIndex(0.5, [])).toBeNull()
  })

  it('selects the segment that contains currentTime', () => {
    expect(getActiveSegmentIndex(0, segments)).toBe(0)
    expect(getActiveSegmentIndex(0.999, segments)).toBe(0)
    expect(getActiveSegmentIndex(1, segments)).toBe(1)
    expect(getActiveSegmentIndex(2.49, segments)).toBe(1)
  })

  it('returns null outside all cue ranges', () => {
    expect(getActiveSegmentIndex(-0.1, segments)).toBeNull()
    expect(getActiveSegmentIndex(2.5, segments)).toBeNull()
    expect(getActiveSegmentIndex(3, segments)).toBeNull()
  })
})
