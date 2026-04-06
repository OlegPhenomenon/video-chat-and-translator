# Implementation Plan: Загрузка видео и доступ к ранее загруженным видео

**Source spec:** `spec.md`  
**Feature:** `006-video-uploader-page`  
**Grounded against current codebase:** `2026-04-06`

## 1. Текущее состояние кода

План ниже опирается на фактическое состояние репозитория, а не только на `spec.md`.

- Rails-приложение находится в подпапке `video_chat_and_translator/`, а не в корне репозитория.
- [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb) сейчас содержит только `root`, `dashboard`, Devise routes и профиль; маршрутов `/videos` и `/videos/:id` ещё нет.
- [video_chat_and_translator/db/schema.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/db/schema.rb) содержит только таблицу `users`; таблиц `videos` и `active_storage_*` нет.
- [video_chat_and_translator/app/controllers/application_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/application_controller.rb) по умолчанию защищает все контроллеры через `authenticate_user!` и шарит в Inertia только `flash` и `current_user`.
- Защищённые shell-страницы уже рендерятся через Inertia-контроллеры, например [video_chat_and_translator/app/controllers/pages/dashboard_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/pages/dashboard_controller.rb) -> `render inertia: "Dashboard"`.
- [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx) уже отвечает за навигацию авторизованного пользователя, но ссылки на `/videos` пока нет.
- [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx) пока минимален и не содержит CTA для загрузки видео.
- В `app/frontend/pages/` ещё нет директории `videos/`; страниц `videos/Index.tsx` и `videos/Show.tsx` не существует.
- В `app/frontend/features/` ещё нет video-storage модуля; в [video_chat_and_translator/package.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package.json) нет зависимости `idb`, значит план должен исходить из реализации на чистом IndexedDB API, если отдельное согласование на npm-зависимость не получено.
- Request specs сейчас проверяют Inertia-ответы через `response.body.include?(...)`, например [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb) и [video_chat_and_translator/spec/requests/users/profile_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/profile_spec.rb).
- В `video_chat_and_translator/docs/features/` уже есть feature-docs, поэтому новая публичная функциональность должна документироваться там же.

## 2. Архитектурные решения и ограничения

- Изменения схемы БД не требуются и противоречат инвариантам спеки. Миграции не нужны.
- Новые gems не требуются.
- Отдельная npm-зависимость для IndexedDB не обязательна. Без отдельного разрешения лучше реализовать storage-модуль на нативном `window.indexedDB`.
- Видео не должно проходить через Rails-контроллеры, PostgreSQL или Active Storage. Серверная часть здесь только shell для защищённых Inertia-страниц.
- Контроллер для видео должен оставаться CRUD-only: `VideosController#index` и `VideosController#show` без upload-экшенов.
- Список видео нельзя прокидывать в shared props из Rails, потому что данные device-local и должны читаться только на клиенте.
- Так как `ApplicationController` уже защищает контроллеры, `VideosController` не должен ослаблять auth-цепочку; для гостей корректным поведением будет redirect на `new_user_session_path`, в отличие от кастомного `/dashboard`.
- Для `videos#show` сервер должен передать только строковый `id` как Inertia prop; сам blob ищется на клиенте через storage-модуль.
- Для object URL нужен явный cleanup через `URL.revokeObjectURL()`, иначе появится утечка памяти при переходах между видео.

## 3. Планируемые файлы

### Backend

- [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb)
- [video_chat_and_translator/app/controllers/videos_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/videos_controller.rb) `new file`

### Frontend

- [video_chat_and_translator/app/frontend/features/videos/storage.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/features/videos/storage.ts) `new file`
- [video_chat_and_translator/app/frontend/pages/videos/Index.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/videos/Index.tsx) `new file`
- [video_chat_and_translator/app/frontend/pages/videos/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/videos/Show.tsx) `new file`
- [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx)
- [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx)

### Tests and docs

- [video_chat_and_translator/spec/requests/videos_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/videos_spec.rb) `new file`
- [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb) `optional touch if nav assertions are added`
- [video_chat_and_translator/docs/features/video-library.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/video-library.md) `new file`
- [video_chat_and_translator/docs/features/header-navigation.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/header-navigation.md) `update: add /videos routes and nav link`

### Explicitly not touched

- [video_chat_and_translator/db/schema.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/db/schema.rb)
- [video_chat_and_translator/package.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package.json), unless later approved to add `idb`

## 4. Atomic implementation steps

| Step | Goal | Depends on | Files | Checkpoint |
|------|------|------------|-------|------------|
| 1 | Зафиксировать shell-маршруты и auth-ожидания тестами | none | `spec/requests/videos_spec.rb` | Request specs описывают `/videos` и `/videos/:id` для auth/guest до UI-логики |
| 2 | Добавить серверный shell для `/videos` и `/videos/:id` | 1 | `config/routes.rb`, `app/controllers/videos_controller.rb` | Авторизованный пользователь получает Inertia `videos/Index` и `videos/Show`; гость редиректится по стандартному Devise-потоку |
| 3 | Реализовать client-side storage API поверх IndexedDB | 2 | `app/frontend/features/videos/storage.ts` | Есть `saveVideo`, `listVideos`, `findVideo`, `StorageError`, сортировка/метаданные и нормализация ошибок |
| 4 | Собрать страницу библиотеки и загрузки `/videos` | 3 | `app/frontend/pages/videos/Index.tsx` | Работают loading, empty, saving, error и redirect на `/videos/:id` после сохранения |
| 5 | Встроить точки входа в навигацию | 4 | `app/frontend/components/Header.tsx`, `app/frontend/pages/Dashboard.tsx` | У авторизованного пользователя появляется ссылка «Видео» и CTA на dashboard |
| 6 | Собрать страницу просмотра `/videos/:id` | 3, 2 | `app/frontend/pages/videos/Show.tsx`, `app/controllers/videos_controller.rb` | Страница читает `id` из Inertia props, загружает запись из IndexedDB, создаёт и освобождает object URL |
| 7 | Задокументировать feature boundary и UX-состояния | 2-6 | `docs/features/video-library.md` (new), `docs/features/header-navigation.md` (update) | Новый doc описывает routes, storage API, ограничения; существующий header-navigation.md обновлён маршрутами `/videos` и пометкой о nav-ссылке |
| 8 | Прогнать верификацию в Docker | 1-7 | touched files only | Request specs и целевые проверки проходят без регрессий |

## 5. Детализация по шагам

### Step 1. Сначала расширить request specs

**Почему first:** серверный контракт должен быть зафиксирован до клиентской реализации.

Создать [video_chat_and_translator/spec/requests/videos_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/videos_spec.rb) со сценариями:

- `GET /videos` для `create(:user, :confirmed)` + `sign_in user` -> `200` и `response.body` содержит `videos/Index`
- `GET /videos/:id` для авторизованного пользователя -> `200` и `response.body` содержит `videos/Show`
- `GET /videos` для гостя -> redirect на `new_user_session_path`
- `GET /videos/:id` для гостя -> redirect на `new_user_session_path`
- для `show` отдельно проверить, что Inertia-ответ содержит переданный `id`, потому что это единственный серверный prop-контракт страницы

Дополнительная проверка:

- если существующие nav-ожидания лежат в [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb), при необходимости добавить мягкую регрессионную проверку, что добавление `/videos` не ломает текущие страницы

### Step 2. Добавить CRUD-shell для видео

Изменить [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb):

- добавить `resources :videos, only: [:index, :show]`

Создать [video_chat_and_translator/app/controllers/videos_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/videos_controller.rb):

- наследоваться от `InertiaController`
- не добавлять upload/save/delete логику
- `index` -> `render inertia: "videos/Index"`
- `show` -> `render inertia: "videos/Show", props: { id: params[:id].to_s }`

Почему так:

- контроллер остаётся CRUD-only и не нарушает проектные правила
- auth уже обеспечивается `ApplicationController#authenticate_user!`
- вся файловая логика остаётся на фронтенде

### Step 3. Реализовать storage-модуль на IndexedDB

Создать [video_chat_and_translator/app/frontend/features/videos/storage.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/features/videos/storage.ts).

Минимальный контракт:

- `saveVideo(file: File): Promise<StoredVideoRecord>`
- `listVideos(): Promise<StoredVideoRecord[]>`
- `findVideo(id: string): Promise<StoredVideoRecord | null>`
- `StorageError extends Error`
- `StorageErrorCode = 'unsupported' | 'quota_exceeded' | 'unknown'`

Структура записи:

- `id`
- `name`
- `type`
- `size`
- `createdAt`
- `updatedAt`
- `file`

Решения, привязанные к текущему проекту:

- использовать один object store, например `videos`
- хранить `File`/`Blob` как есть, без base64
- сортировку `createdAt DESC` делать на клиенте в `listVideos()`, если в store нет отдельного index
- генерацию `id` делать на клиенте через `crypto.randomUUID()` с fallback только если это действительно нужно для совместимости; сложный polyfill не нужен без явного требования
- нормализовать DOMException/браузерные ошибки в `StorageError`
  - отсутствие `indexedDB` -> `unsupported`
  - `QuotaExceededError` -> `quota_exceeded`
  - прочее -> `unknown`

Отдельно зафиксировать в коде:

- модуль не знает ничего о Rails
- список видео не кешируется в shared props и не синхронизируется между устройствами

### Step 4. Собрать страницу `videos/Index`

Создать [video_chat_and_translator/app/frontend/pages/videos/Index.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/videos/Index.tsx).

Что должно быть на странице:

- `Head` с понятным title
- file input с `accept="video/*"`
- загрузка списка через `listVideos()` на mount
- список видео с названием, размером, датой загрузки и ссылкой на `/videos/:id`
- состояния `loading`, `empty`, `saving`, `error`

Последовательность реализации:

1. На mount вызвать `listVideos()`
2. Пока список грузится, показать `Загрузка...`, но не блокировать input
3. При unsupported-ошибке:
   - показать сообщение про отсутствие поддержки локального хранения
   - заблокировать input
4. При generic list-ошибке:
   - показать текст про невозможность загрузить список
   - оставить input доступным
5. При выборе файла:
   - валидировать `file.type.startsWith('video/')`
   - на невалидный тип показать сообщение и не вызывать `saveVideo`
6. Во время `saveVideo`:
   - заблокировать input
   - показать `Сохранение...`
7. После успешного сохранения:
   - перейти через Inertia/router на `/videos/:id`
8. При `quota_exceeded`:
   - остаться на `/videos`
   - сохранить уже загруженный список на экране
   - разблокировать input
   - показать точное сообщение из спеки
9. При любой иной ошибке сохранения:
   - аналогично остаться на странице
   - показать generic error-message

Практическое замечание:

- для форматирования размера и даты лучше добавить небольшие локальные helper-функции в эту страницу, а не отдельный shared util, чтобы не раздувать scope

### Step 5. Добавить точки входа в существующий UI

Изменить [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx):

- добавить ссылку `href="/videos"` для авторизованного пользователя
- не удалять и не менять существующие ссылки `/`, `/dashboard`, `/users/profile`, logout
- сохранить текущую active-link логику через `page.url`

Изменить [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx):

- добавить CTA-блок с кнопкой/ссылкой `Загрузить видео` -> `/videos`
- не ломать текущую минимальную структуру страницы

Проверка шага:

> **Важно:** request specs не могут проверить клиентски отрендеренный React-компонент `Header` или кнопку на `Dashboard.tsx`. Автоматическая верификация (`bundle exec rspec` + `npm run check`) подтверждает только отсутствие TypeScript-ошибок и что Inertia отдаёт правильный компонент. Наличие ссылки «Видео» и CTA проверяется **только ручным smoke-check** (см. Step 8).

Ручные проверки (smoke-check, не автоматические):
- хедер по-прежнему содержит все старые ссылки
- ссылка «Видео» видна на всех Inertia-страницах с `AppLayout`
- dashboard даёт явную точку входа в feature

### Step 6. Собрать страницу `videos/Show`

Создать [video_chat_and_translator/app/frontend/pages/videos/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/videos/Show.tsx).

Контракт страницы:

- читать `id` из `usePage().props.id`
- вызывать `findVideo(id)` на mount/при изменении `id`
- при успехе создать `objectURL` из `record.file`
- на cleanup вызывать `URL.revokeObjectURL()`

Состояния:

- loading: только `Загрузка...`
- success: имя файла + `<video controls src={objectURL}>`
- not found: текст про отсутствие видео + ссылка назад на `/videos`
- error: текст про невозможность загрузки + ссылка назад на `/videos`

Важно:

- страница не должна инициировать сетевой запрос за файлом
- object URL должен пересоздаваться только после успешного чтения новой записи
- если `findVideo` вернул `null`, это `empty/not found`, а не generic error

### Step 7. Документация

Создать [video_chat_and_translator/docs/features/video-library.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/video-library.md).

Документ должен содержать:

- route map:
  - `GET /videos` -> `VideosController#index` -> `videos/Index`
  - `GET /videos/:id` -> `VideosController#show` -> `videos/Show`
- описание boundary:
  - Rails отвечает только за auth + Inertia shell
  - IndexedDB отвечает за blob и метаданные
- API storage-модуля:
  - `saveVideo`
  - `listVideos`
  - `findVideo`
  - `StorageError` codes
- UI states для index/show
- явное ограничение: данные доступны только в текущем браузере и на текущем устройстве
- секцию `Out of scope`

Обновить [video_chat_and_translator/docs/features/header-navigation.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/header-navigation.md):

- В Route Map добавить строку:
  - `GET /videos` -> `VideosController#index` -> Auth: Yes -> Guests redirected to sign_in
  - `GET /videos/:id` -> `VideosController#show` -> Auth: Yes -> Guests redirected to sign_in
- В секции Global Layout / Header добавить примечание, что авторизованным пользователям в `Header` отображается ссылка «Видео» -> `/videos`

### Step 8. Финальная верификация

Так как по проектным правилам тестирование обязательно, перед завершением нужно прогнать проверки внутри Docker-контейнера приложения.

Минимальный набор (все команды выполняются через Docker, не на хосте):

```bash
docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/requests/videos_spec.rb
docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/requests/pages_spec.rb spec/requests/users/profile_spec.rb
docker compose -f docker/docker-compose.yml exec web bundle exec rspec
docker compose -f docker/docker-compose.yml exec web npm run check
```

Отдельный ручной sanity-check после автотестов:

- авторизованный пользователь открывает `/videos`
- загружает валидный файл
- после reload запись остаётся в списке
- переход на `/videos/:id` воспроизводит видео
- в другом браузере или после очистки origin data запись недоступна

## 6. Риски и контрольные вопросы

- Главный риск не в backend, а в различиях IndexedDB API между браузерами. Поэтому нормализация ошибок в `storage.ts` должна быть покрыта хотя бы ручной проверкой unsupported/quota paths.
- Если команда всё же захочет использовать `idb`, это отдельное согласование, потому что сейчас [video_chat_and_translator/package.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package.json) такой зависимости не содержит.
- Request specs не покрывают сам IndexedDB runtime. Поэтому качество этой фичи будет опираться на сочетание request specs, `npm run check` и ручного smoke-check в браузере.
- Если в текущем layout нет готового page-level error banner, не нужно вводить общий фреймворк уведомлений в рамках этой задачи; достаточно локальных error-state блоков на `Index` и `Show`.

## 7. Definition of Done

- Добавлены и проходят request specs для `/videos` и `/videos/:id`
- `VideosController` остаётся shell-only и не работает с файлами на сервере
- IndexedDB storage-модуль сохраняет `File`/`Blob` и умеет читать записи по `id`
- `videos/Index` покрывает loading, empty, saving, invalid-file, unsupported, quota-exceeded и generic-error состояния
- `videos/Show` покрывает loading, success, not-found и error состояния, с cleanup object URL
- В хедере есть ссылка «Видео», а в dashboard есть CTA на `/videos` (проверяется только ручным smoke-check — request specs не могут верифицировать клиентски отрендеренные React-компоненты)
- Создан [video_chat_and_translator/docs/features/video-library.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/video-library.md)
- Обновлён [video_chat_and_translator/docs/features/header-navigation.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/header-navigation.md): добавлены маршруты `/videos` и `/videos/:id`, отмечена ссылка «Видео» в Header
- Полный RSpec-набор и `npm run check` проходят в Docker-окружении проекта (`docker compose -f docker/docker-compose.yml exec web ...`)
