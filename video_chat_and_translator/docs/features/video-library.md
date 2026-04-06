# Video Library Feature

## Route Map

| Method | Path          | Controller              | Inertia Component | Auth |
| ------ | ------------- | ----------------------- | ----------------- | ---- |
| GET    | `/videos`     | `VideosController#index` | `videos/Index`   | Yes — guests redirected to sign_in |
| GET    | `/videos/:id` | `VideosController#show`  | `videos/Show`    | Yes — guests redirected to sign_in |

## Architecture Boundary

- **Rails** is responsible only for authentication and rendering Inertia shells.
- **IndexedDB** (in the browser) is responsible for storing video blobs and metadata.
- Video files are never sent to the server, stored in PostgreSQL, or processed by Active Storage.
- Video data is accessible only in the browser/device where the file was uploaded. It is not synced across devices or users.

## Controller

**File:** `app/controllers/videos_controller.rb`

```ruby
class VideosController < InertiaController
  def index
    render inertia: "videos/Index"
  end

  def show
    render inertia: "videos/Show", props: { id: params[:id].to_s }
  end
end
```

- Inherits auth from `ApplicationController` via `InertiaController`.
- `show` passes only the string `id` as a prop. The actual blob is fetched client-side.

## Storage Module

**File:** `app/frontend/features/videos/storage.ts`

### API

| Function | Signature | Description |
|----------|-----------|-------------|
| `saveVideo` | `(file: File) => Promise<StoredVideoRecord>` | Saves a File/Blob to IndexedDB, generates UUID id |
| `listVideos` | `() => Promise<StoredVideoRecord[]>` | Returns all records sorted by `createdAt DESC` |
| `findVideo` | `(id: string) => Promise<StoredVideoRecord \| null>` | Finds a record by id; returns null if not found |

### `StoredVideoRecord`

```ts
interface StoredVideoRecord {
  id: string
  name: string
  type: string
  size: number
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
  file: File
}
```

### `StorageError`

```ts
class StorageError extends Error {
  code: 'unsupported' | 'quota_exceeded' | 'unknown'
}
```

| Code | Cause |
|------|-------|
| `unsupported` | `window.indexedDB` is unavailable |
| `quota_exceeded` | Browser storage quota exceeded (`QuotaExceededError`) |
| `unknown` | Any other DOMException or unexpected error |

## UI States

### `videos/Index` (file: `app/frontend/pages/videos/Index.tsx`)

| State | Trigger | Behavior |
|-------|---------|----------|
| `loading` | Initial mount, `listVideos()` in flight | Shows "Загрузка..." text; input still visible |
| `unsupported` | `StorageError.code === 'unsupported'` | Warning banner shown; file input disabled |
| `error` (list) | Any other error from `listVideos()` | Error message shown; file input still usable |
| `empty` | `listVideos()` returns `[]` | "Нет загруженных видео" message |
| `ready` | `listVideos()` returns records | Video list rendered with name, size, date, watch link |
| `saving` | `saveVideo()` in flight | Input disabled; "Сохранение..." shown |
| `invalid-file` | Selected file type doesn't start with `video/` | Error shown; no `saveVideo()` call |
| `quota_exceeded` | `StorageError.code === 'quota_exceeded'` from save | Error shown; stays on page; input re-enabled |
| `save-error` | Other error from `saveVideo()` | Generic error shown; stays on page |
| Success | `saveVideo()` resolves | Redirects to `/videos/:id` |

### `videos/Show` (file: `app/frontend/pages/videos/Show.tsx`)

| State | Trigger | Behavior |
|-------|---------|----------|
| `loading` | Initial mount, `findVideo()` in flight | Shows "Загрузка..." |
| `success` | `findVideo()` resolves with record | Video title + `<video controls>` rendered; object URL created |
| `not_found` | `findVideo()` returns `null` | Informational message + back link to `/videos` |
| `error` | `StorageError` from `findVideo()` | Error message + back link to `/videos` |

Object URL lifecycle: created after successful `findVideo`, revoked in `useEffect` cleanup to prevent memory leaks.

## Out of Scope

- Server-side video storage (Active Storage, PostgreSQL, S3)
- Cross-device or cross-browser video access
- Video deletion
- Video search or filtering
- Thumbnails or transcoding
- Shared video links
