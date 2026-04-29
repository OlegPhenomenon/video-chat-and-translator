# FT-019 Simplify Review

Date: 2026-04-29

Reviewed touched implementation surfaces:

- `app/frontend/features/videos/subtitles/vtt.ts`
- `app/frontend/features/videos/subtitles/active-segment.ts`
- `app/frontend/features/videos/subtitles/SubtitlesPanel.tsx`
- `app/frontend/pages/videos/Show.tsx`
- related Vitest coverage under `spec/frontend/`

Conclusion:

- Parser and active-segment selection remain pure helper modules.
- `SubtitlesPanel` stays presentational and does not own IndexedDB, file IO, or the video element.
- `VideosShow` remains the owner of `videoRef`, subtitle file reading, native `<track>` state, and page integration.
- No extra shared UI library, server endpoint, migration, or cross-feature abstraction was introduced.
