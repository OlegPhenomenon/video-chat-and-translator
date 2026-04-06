# Spec: Загрузка видео и доступ к ранее загруженным видео

**Brief:** [brief.md](./brief.md)
**Research:** [research.md](./research.md)
**Issue:** [GitHub Issue #6](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/6)
**Status:** active
**Date:** 06.04.2026

---

## Контекст и grounding

- Актуальные маршруты приложения: публичный `/`, защищённый `/dashboard`, профиль `/users/profile`.
- В `video_chat_and_translator/db/schema.rb` есть только таблица `users`; таблиц `videos` и `active_storage_*` нет.
- Приложение уже использует Inertia + React с общим `AppLayout`, `Header` и shared props `current_user`.
- У авторизованного пользователя уже есть точки входа через `Header.tsx` и страницу `Dashboard.tsx`.
- Фича должна соответствовать Issue #6: видео не хранится на сервере, а остаётся в IndexedDB конкретного браузера на конкретном устройстве.

## Инварианты

- Видео не отправляется на Rails-сервер и не сохраняется в PostgreSQL.
- Новые миграции не требуются.
- Контроллеры остаются тонкими и CRUD-only.
- Список видео не попадает в Inertia shared props.
- Обещание пользователю ограничено данным браузером и устройством, пока origin data не очищены пользователем или браузером.

---

## Эпики и фичи (Vertical Slices)

### Epic 1: Server Shell for Video Flow

#### Feature 1.1: Добавить CRUD-shell маршруты `videos#index` и `videos#show`

**Deliverables:**
- Добавлен `resources :videos, only: [:index, :show]`
- Создан `VideosController` с действиями `index` и `show`
- Оба действия рендерят Inertia-страницы и не принимают upload на сервер

**Acceptance criteria:**
- [ ] GET `/videos` для авторизованного пользователя возвращает Inertia-компонент `videos/Index`
- [ ] GET `/videos/:id` для авторизованного пользователя возвращает Inertia-компонент `videos/Show`
- [ ] Гость не получает доступ к `/videos` и `/videos/:id`
- [ ] В контроллере нет логики сохранения/чтения видеофайлов на сервере

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/config/routes.rb` — добавить `resources :videos, only: [:index, :show]`
- `video_chat_and_translator/app/controllers/videos_controller.rb` — NEW

---

### Epic 2: Client-Side Video Library

#### Feature 2.1: Storage-модуль для IndexedDB

**Deliverables:**
- Отдельный frontend-модуль хранения видео
- API модуля покрывает операции:
  - `saveVideo(file)`
  - `listVideos()`
  - `findVideo(id)`
  - нормализацию ошибок `unsupported` и `quota exceeded`
- Хранится исходный `Blob/File`, а не base64

**Acceptance criteria:**
- [ ] Видео сохраняется в IndexedDB вместе с метаданными `id`, `name`, `type`, `size`, `createdAt`, `updatedAt`
- [ ] Повторное чтение списка после reload возвращает ранее загруженные записи
- [ ] Запись может быть получена по `id`
- [ ] При отсутствии IndexedDB модуль возвращает ошибку типа `StorageError` с кодом `'unsupported'`
- [ ] При переполнении хранилища модуль возвращает ошибку типа `StorageError` с кодом `'quota_exceeded'`

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/features/videos/storage.ts` — NEW
- `video_chat_and_translator/package.json` — только если команда утвердит `idb` как npm-зависимость

---

### Epic 3: Upload and Library UI

#### Feature 3.1: Страница загрузки и списка `videos/Index`

**Deliverables:**
- Новый Inertia-компонент `videos/Index.tsx`
- На странице есть:
  - file input для выбора видео;
  - список ранее загруженных видео;
  - состояния `loading`, `empty`, `saving`, `error`
- После успешного сохранения происходит переход на `/videos/:id`

**Acceptance criteria:**
- [ ] Пока `listVideos()` не завершился: отображается loading-state (текст «Загрузка...»), список и empty-state не рендерятся; file input доступен
- [ ] Пока `saveVideo(file)` выполняется: file input заблокирован (`disabled`), повторный submit невозможен, отображается saving-state (текст «Сохранение...»)
- [ ] Пользователь может выбрать файл с `type` начинающимся на `video/`
- [ ] Невалидный тип файла не сохраняется; пользователь видит сообщение «Выберите видеофайл (mp4, webm, ogg и др.)», file input снова доступен
- [ ] После успешного сохранения выполняется переход на `/videos/:id` нового видео
- [ ] На странице виден список ранее загруженных видео, отсортированный по `createdAt DESC`
- [ ] Каждая запись списка показывает минимум: название файла, размер, дату загрузки и ссылку/кнопку открытия
- [ ] Если в IndexedDB нет записей, отображается empty-state с текстом «У вас пока нет загруженных видео», а не пустой контейнер
- [ ] Если `listVideos()` завершается с ошибкой (не `'unsupported'`): список не отображается, пользователь видит error-state с текстом «Не удалось загрузить список видео. Попробуйте обновить страницу.»; file input остаётся доступным
- [ ] Если браузер не поддерживает IndexedDB (ошибка `StorageError` с кодом `'unsupported'`), пользователь видит error-state с текстом «Ваш браузер не поддерживает локальное хранение видео. Попробуйте другой браузер.»; file input заблокирован (`disabled`)
- [ ] При ошибке `quota_exceeded` во время сохранения: пользователь остаётся на `/videos`, список ранее сохранённых видео остаётся видимым, file input снова доступен, отображается error-state с текстом «Недостаточно места в хранилище. Освободите место или выберите файл меньшего размера.»
- [ ] При любой иной ошибке записи в IndexedDB во время сохранения: пользователь остаётся на `/videos`, список ранее сохранённых видео остаётся видимым, file input снова доступен, отображается error-state с текстом «Не удалось сохранить видео. Попробуйте снова.»
- [ ] После отображения любого error-state пользователь может повторно выбрать файл без перезагрузки страницы

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/pages/videos/Index.tsx` — NEW
- `video_chat_and_translator/app/frontend/features/videos/storage.ts` — использовать для чтения/записи

---

#### Feature 3.2: Вход в сценарий через существующую навигацию

**Deliverables:**
- Ссылка `Видео` в `Header.tsx` для авторизованного пользователя
- CTA-блок на `Dashboard.tsx` с заголовком «Мои видео» и кнопкой «Загрузить видео», ведущей на `/videos`

**Acceptance criteria:**
- [ ] В авторизованном хедере есть ссылка с текстом «Видео», ведущая на `/videos`
- [ ] Ссылка видна на всех Inertia-страницах с `AppLayout`
- [ ] После добавления ссылки «Видео» хедер по-прежнему содержит все существующие ссылки: «Главная», «Дашборд», «Профиль», «Выйти» — ни одна не исчезает и не меняет href
- [ ] На `Dashboard.tsx` есть CTA-блок с кнопкой «Загрузить видео», ведущей на `/videos`

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/components/Header.tsx`
- `video_chat_and_translator/app/frontend/pages/Dashboard.tsx`

---

### Epic 4: Video Player Page

#### Feature 4.1: Страница просмотра `videos/Show`

**Контракт `id`:** Rails-контроллер передаёт строковый `id` как Inertia prop. Фронтенд читает его из `usePage().props.id` и передаёт в `findVideo(id)` storage-модуля.

**Deliverables:**
- Новый Inertia-компонент `videos/Show.tsx`
- Загрузка записи по `id` из IndexedDB через `findVideo(id)` storage-модуля
- Создание `objectURL` для `<video controls>`
- Очистка `objectURL` через `URL.revokeObjectURL()` при unmount/смене записи

**Acceptance criteria:**
- [ ] Пока `findVideo(id)` не завершился: отображается loading-state (текст «Загрузка...»); плеер и контентная область скрыты; Header остаётся видимым
- [ ] Страница читает `id` из Inertia props (`usePage().props.id`) и загружает соответствующую запись из IndexedDB
- [ ] При успешной загрузке loading-state заменяется на `<video controls src={objectURL}>` с именем файла над плеером
- [ ] Видео воспроизводится через blob/object URL — ни один сетевой запрос к Rails-серверу за файлом не отправляется
- [ ] Если запись не найдена: отображается empty-state с текстом «Видео не найдено. Возможно, оно было удалено или не загружалось в этом браузере.» и ссылкой «Вернуться к списку» → `/videos`
- [ ] При ошибке чтения из IndexedDB: отображается error-state с текстом «Не удалось загрузить видео. Попробуйте снова или вернитесь к списку.» и ссылкой «Вернуться к списку» → `/videos`
- [ ] В обоих error/empty состояниях Header остаётся видимым со всеми ссылками: «Главная», «Дашборд», «Профиль», «Видео», «Выйти»
- [ ] Object URL освобождается через `URL.revokeObjectURL()` при unmount компонента

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` — NEW
- `video_chat_and_translator/app/frontend/features/videos/storage.ts`
- `video_chat_and_translator/app/controllers/videos_controller.rb`

---

### Epic 5: Documentation and Quality Gates

#### Feature 5.1: Документация реализации

**Deliverables:**
- Документ `docs/features/video-library.md`
- В документе описаны:
  - маршруты `/videos` и `/videos/:id`;
  - boundary между Rails shell и IndexedDB storage;
  - основные UI-состояния;
  - ограничение про browser/device-local хранение

**Acceptance criteria:**
- [ ] Файл `docs/features/video-library.md` существует
- [ ] Документ описывает маршруты `/videos` и `/videos/:id` с указанием контроллера и Inertia-компонента
- [ ] Документ описывает API storage-модуля: `saveVideo`, `listVideos`, `findVideo`, коды ошибок `unsupported` и `quota_exceeded`
- [ ] Документ перечисляет все UI-состояния каждой страницы (loading, empty, saving, error, success)
- [ ] Документ явно указывает, что видео не хранятся на сервере и доступны только в рамках данного браузера/устройства
- [ ] Документ содержит раздел «Out of scope» с перечнем того, что не реализовано в этой фиче

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/docs/features/video-library.md` — NEW

---

#### Feature 5.2: Автотесты для shell-маршрутов и навигации

**Deliverables:**
- Request spec для `/videos`
- Request spec для `/videos/:id`
- Обновление существующих request specs при необходимости для проверки ссылки в shell/nav-ответе

**Acceptance criteria:**
- [ ] Авторизованный пользователь получает Inertia-ответ для `/videos`
- [ ] Авторизованный пользователь получает Inertia-ответ для `/videos/:id`
- [ ] Гость перенаправляется согласно действующим auth-правилам
- [ ] Добавление video-маршрутов не ломает существующие request specs

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/spec/requests/videos_spec.rb` — NEW
- `video_chat_and_translator/spec/requests/pages_spec.rb` — если потребуется скорректировать проверки навигации

---

## Итоговая карта затрагиваемых файлов

| Файл | Действие | Фича |
|------|----------|------|
| `video_chat_and_translator/config/routes.rb` | Изменить | 1.1 |
| `video_chat_and_translator/app/controllers/videos_controller.rb` | Создать | 1.1, 4.1 |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | Создать | 2.1, 3.1, 4.1, 5.3 |
| `video_chat_and_translator/app/frontend/pages/videos/Index.tsx` | Создать | 3.1 |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | Создать | 4.1 |
| `video_chat_and_translator/app/frontend/components/Header.tsx` | Изменить | 3.2 |
| `video_chat_and_translator/app/frontend/pages/Dashboard.tsx` | Изменить | 3.2 |
| `video_chat_and_translator/spec/requests/videos_spec.rb` | Создать | 5.2 |
| `video_chat_and_translator/docs/features/video-library.md` | Создать | 5.1 |
| `video_chat_and_translator/package.json` | Не изменяется (follow-up) | — |

---

## Что НЕ входит в scope (Issue #6)

- Active Storage и любое серверное файловое хранилище
- Кросс-девайсная и кросс-браузерная синхронизация
- Удаление видео, редактирование метаданных
- Preview / постер-генерация, progress bar загрузки
- Фоновая обработка, транскрибация, перевод, генерация дубляжа
- Drag-and-drop
- Frontend unit-тесты (Vitest/Jest) — вынесены в [follow-up.md](./follow-up.md)

## Definition of Done (Issue #6)

- [ ] Request specs для `/videos` и `/videos/:id` проходят
- [ ] Весь существующий RSpec-набор проходит без регрессий
- [ ] Ручная проверка по чеклисту из [follow-up.md](./follow-up.md) пройдена
