---
title: "FT-020: AI-чат с видео на странице плеера"
doc_kind: feature
doc_function: canonical
purpose: "Дать пользователю задавать вопросы LLM по содержимому видео (используя транскрипт как контекст) прямо на странице видео, с собственным API-ключом и выбором провайдера."
derived_from:
  - ./brief.md
  - ../../project/overview.md
  - ../FT-017_COMPLETED/feature.md
  - ../FT-019_COMPLETED/feature.md
status: active
delivery_status: draft
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-020: AI-чат с видео на странице плеера

## What

### Problem

Пользователь, посмотрев загруженное видео и получив автоматический транскрипт (FT-017), не может задать AI-ассистенту вопрос по содержимому ролика, не покинув приложение. Любой осмысленный анализ — пересказ, поиск конкретного момента, уточнение формулировки, перевод фрагмента — приходится выполнять во внешнем чат-сервисе вручную: переключиться в другую вкладку, вставить транскрипт, сформулировать вопрос, скопировать ответ обратно. Это занимает минимум 4-5 ручных шагов на каждый вопрос и теряет привязку к видеоряду.

Source: Issue [#19](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19) — «Подключи АПИ для чата с видео».

Upstream context: FT-017 уже даёт текст транскрипта в `StoredVideoRecord.subtitles` (VTT в IndexedDB), FT-019 показывает его в боковой панели. Эта delivery-единица — следующий шаг в потоке: использовать тот же текст как контекст для разговора с LLM, оставаясь в client-side архитектуре проекта.

### Scope delta относительно Issue #19

Буквальный текст issue требует: (a) подключить API нескольких провайдеров (перечислены OpenAI, Gemini, Groq, OpenRouter, Anthropic, DeepSeek, Qwen), (b) пользователь сам выбирает провайдера и приносит API-ключ, (c) UI-область чата на странице видео. Ниже фиксируются осознанные расширения и сужения scope (с явным `Why` и описанием, как сузить):

- `DEC-01` MVP список провайдеров (`REQ-03`) — **сужение**: в MVP подключаем 3 провайдера (OpenAI, Anthropic, Groq), остальные 4 (Gemini, OpenRouter, DeepSeek, Qwen) уходят в `NS-01` со статусом «архитектура расширяема, добавление — отдельная delivery-единица». Why: каждый провайдер — отдельный SDK/контракт сообщений, в MVP важнее доказать **архитектуру router-а**, чем покрыть все 7 одинаково. Если расширять — добавлять по одному адаптеру в `features/videos/chat/providers/<name>.ts`. Если сужать — оставить только OpenAI и Anthropic (Groq использует OpenAI-compatible схему, тогда уходит из `REQ-03` и `CTR-02`).
- `DEC-02` Контекст транскрипта (`REQ-05`) — **расширение**: автоматически подмешиваем содержимое VTT (если оно есть для текущего видео) в system message запроса к LLM. Why: без этого чат не даёт обещанной ценности — это будет просто общий чат с моделью, не связанный с видео. Если сужать — убрать `REQ-05`, тогда уходит `CHK-04`, `SC-04`, и пользователь сам копирует фрагмент транскрипта в свой вопрос.
- `DEC-03` Хранение истории сообщений (`REQ-07`) — **расширение**: история сообщений сохраняется в IndexedDB per video, чтобы переоткрытие страницы не теряло прогресс разговора. Why: иначе перезагрузка вкладки или возврат к видео обнуляют диалог, что обессмысливает многократные итерации. Если сужать — убрать `REQ-07`, тогда уходят `CTR-04`, `NEG-03`, и история живёт только в React-state до перезагрузки.
- `DEC-04` Сворачиваемая панель (`REQ-01`) — **расширение**: панель чата следует UI-паттерну `SubtitlesPanel` из FT-019 (toggle сворачивания, та же визуальная семья). Why: пользователь уже привык, что на странице видео есть боковые панели, которые сворачиваются — добавление новой по другому паттерну создаёт когнитивную нагрузку. Если сужать — оставить панель всегда открытой, тогда уходит `REQ-02` и сценарий сворачивания/разворачивания.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Возможность вести диалог с LLM на странице видео без выхода из приложения | На странице видео нет AI-чата; пользователь использует внешние сервисы | На странице видео есть отдельная панель чата, в которой пользователь может задать произвольный вопрос и получить ответ выбранной модели в пределах одной вкладки | UI-проверка по `SC-01`-`SC-03` через Playwright со скриншотами состояний |
| `MET-02` | Поддержка нескольких независимых провайдеров через единый интерфейс | Не поддерживается ни один провайдер | Минимум 3 провайдера (OpenAI, Anthropic, Groq) выбираются переключателем и работают через общий router-интерфейс | Vitest unit-тесты `CHK-02` на провайдер-адаптерах и Playwright-сценарий `SC-02` со сменой провайдера |
| `MET-03` | Подмешивание транскрипта как контекста запроса | Контекст видео не передаётся LLM | Если для видео есть субтитры, они отправляются модели как часть system message; пользователь видит индикатор «контекст транскрипта подключён» | Vitest `CHK-04` (генератор system message) + Playwright `SC-04` |

### Scope

- `REQ-01` На странице видео (`/videos/:id`) появляется отдельная сворачиваемая панель «Чат», располагающаяся рядом с панелью субтитров (или под ней на узких экранах), визуально согласованная с `SubtitlesPanel` из FT-019.
- `REQ-02` Панель чата имеет control сворачивания/раскрытия. При сворачивании панель визуально схлопывается, но history и текущее введённое сообщение не очищаются; повторный toggle разворачивает её к тому же состоянию без перезагрузки.
- `REQ-03` Пользователь выбирает провайдера из выпадающего списка. В MVP список содержит ровно три варианта: OpenAI, Anthropic, Groq. Контракт расширения зафиксирован в `CTR-02`.
- `REQ-04` Пользователь вводит свой API-ключ для выбранного провайдера. Ключ хранится в `localStorage` под ключом `ft-020:chat_api_key:<provider>` (по той же модели, что в FT-017, см. `Show.tsx`). Чекбокс «запомнить в этом браузере» включает/выключает persist; без чекбокса ключ остаётся только в state до перезагрузки.
- `REQ-05` Если у текущего видео есть сохранённые субтитры (`StoredVideoRecord.subtitles` не пуст), их текстовое содержимое автоматически добавляется в system message запроса как контекст транскрипта. Пользователь видит явный индикатор «контекст транскрипта подключён» и может его отключить чекбоксом для конкретного запроса.
- `REQ-06` Поле ввода сообщения + кнопка отправки + список истории сообщений (user/assistant) с явной разметкой ролей. История прокручивается в пределах высоты панели; новые сообщения появляются внизу.
- `REQ-07` История сообщений per-video сохраняется в IndexedDB в новом store-е `chat_messages` через помощник `features/videos/chat/storage.ts`. При повторном открытии страницы того же видео история восстанавливается. Удаление видео (если такая операция появится в проекте) **не** обязано чистить чат-историю в этой delivery-единице (см. `NS-04`).
- `REQ-08` При ошибке провайдера (неверный ключ, network, превышен лимит, провайдер вернул не-200) панель показывает ясное сообщение об ошибке (рядом с последним user-сообщением, не как глобальный alert) с возможностью повторить отправку. Конкретные причины ошибок мапятся на пользовательские формулировки, как это сделано в `transcription/` (`isTranscriptionError`).

### Non-Scope

- `NS-01` В MVP **не** подключаем Gemini, OpenRouter, DeepSeek, Qwen. Архитектура `CTR-02` позволяет добавить каждый отдельным адаптером без изменения UI — это отдельные follow-up delivery-единицы.
- `NS-02` Не делаем стриминг ответа (token-by-token). Ответ показывается целиком после получения. Стриминг — отдельная фича.
- `NS-03` Не делаем поиск/семантический поиск по транскрипту. Контекст подаётся целиком (с возможным truncation, см. `FM-03`).
- `NS-04` Не делаем синхронизацию чат-истории с серверным аккаунтом. История живёт только в IndexedDB браузера и теряется при очистке хранилища или работе в другом браузере. Это явно соответствует client-side архитектурному принципу проекта.
- `NS-05` Не добавляем Rails-серверные endpoints, фоновые джобы, миграции БД. Все запросы к LLM идут напрямую из браузера, как уже сделано в `transcription/` (`Show.tsx` отправляет POST на `https://api.openai.com/v1/audio/transcriptions` без посредника).
- `NS-06` Не добавляем редактирование/удаление отдельных сообщений в истории. Доступна только полная очистка истории для текущего видео (`REQ-07` + UI-control «Очистить чат»).
- `NS-07` Не добавляем mock-провайдер для оффлайн-разработки. Тестирование адаптеров — на уровне Vitest с замоканным `fetch`. UI-тестирование с реальным провайдером требует валидного API-ключа от пользователя.
- `NS-08` Не добавляем форматирование Markdown в ответах ассистента в MVP. Ответ показывается как plain text. Markdown-rendering — отдельная фича.

### Constraints / Assumptions

- `ASM-01` Запрос к API провайдера выполняется напрямую из браузера. Это уже принятый паттерн проекта (см. `features/videos/transcription/client.ts`); CORS и rate-limit ограничения провайдера применяются как есть, без серверного proxy.
- `ASM-02` `StoredVideoRecord.subtitles` (если есть) — валидный VTT в кодировке UTF-8, как это устанавливают FT-017/FT-019. Извлечение plain text для контекста использует тот же `parseVtt` из `features/videos/subtitles/`.
- `ASM-03` Пользователь приносит свой API-ключ с лимитами/балансом. Приложение не оплачивает запросы и не выпускает proxy-ключи.
- `CON-01` Реализация — client-side, без серверных вызовов и миграций БД. Соответствует архитектурному принципу проекта.
- `CON-02` Стек UI: React 19 + Inertia + Tailwind. Без введения новых UI-библиотек.
- `CON-03` Никакого глобального state-management (Zustand/Redux) не вводится. Состояние чата живёт в локальном `useState`/`useReducer` страницы `Show.tsx` плюс IndexedDB-helper.
- `CON-04` API-ключ **никогда** не отправляется на Rails-сервер. В network-логе должны быть только хосты провайдеров (`api.openai.com`, `api.anthropic.com`, `api.groq.com`).

## How

### Solution

Ввести новый feature-модуль `app/frontend/features/videos/chat/` с:

- `client.ts` — единый router, принимающий `{ provider, apiKey, messages, transcript? }` и делегирующий вызов в адаптер провайдера.
- `providers/openai.ts`, `providers/anthropic.ts`, `providers/groq.ts` — адаптеры под REST-API соответствующих провайдеров. Каждый возвращает нормализованный `ChatResponse`.
- `errors.ts` — типизированные ошибки (`ChatError` с кодами `invalid_api_key`, `network`, `rate_limit`, `provider_error`, `unknown`), по образцу `transcription/errors.ts`.
- `storage.ts` — обёртка над IndexedDB для чтения/записи истории сообщений (object store `chat_messages`, ключ — `videoId`).
- `context.ts` — функция извлечения plain-text транскрипта из VTT (использует существующий `parseVtt`) + сборка system message.
- `ChatPanel.tsx` — presentational + interactive компонент панели (визуальная семья `SubtitlesPanel`).
- `index.ts` — barrel export.

На странице `Show.tsx` добавляется рендер `<ChatPanel videoId={...} subtitlesFile={...} />` рядом с `<SubtitlesPanel />`, layout перестраивается с горизонтального split (видео + субтитры) на трёхколоночный (видео + субтитры + чат) на широких экранах и вертикальный stack на узких. Главный trade-off: держим chat в собственном feature-модуле, чтобы не плодить ответственности в `transcription/` (там — VTT-генерация) и в `subtitles/` (там — рендер VTT). Чат — отдельный сценарий, отдельная сетевая поверхность, отдельные ошибки.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | code | Добавить рендер `ChatPanel`, layout-перестройку под три колонки на десктопе, передать `subtitlesFile` в чат для сборки контекста |
| `video_chat_and_translator/app/frontend/features/videos/chat/client.ts` (новый) | code | Router запросов: `chat({provider, apiKey, messages, transcript}) → Promise<ChatResponse>` (см. `CTR-01`) |
| `video_chat_and_translator/app/frontend/features/videos/chat/providers/openai.ts` (новый) | code | Адаптер OpenAI Chat Completions API |
| `video_chat_and_translator/app/frontend/features/videos/chat/providers/anthropic.ts` (новый) | code | Адаптер Anthropic Messages API |
| `video_chat_and_translator/app/frontend/features/videos/chat/providers/groq.ts` (новый) | code | Адаптер Groq Chat Completions (OpenAI-compatible) |
| `video_chat_and_translator/app/frontend/features/videos/chat/errors.ts` (новый) | code | Типизированные ошибки + helper `isChatError` |
| `video_chat_and_translator/app/frontend/features/videos/chat/storage.ts` (новый) | code | IndexedDB CRUD для истории сообщений (см. `CTR-04`) |
| `video_chat_and_translator/app/frontend/features/videos/chat/context.ts` (новый) | code | Plain-text из VTT + сборка system message (см. `CTR-03`) |
| `video_chat_and_translator/app/frontend/features/videos/chat/ChatPanel.tsx` (новый) | code | Сворачиваемая панель: history list, input, send, provider/model/key controls, error display |
| `video_chat_and_translator/app/frontend/features/videos/chat/index.ts` (новый) | code | Barrel export для импорта из `Show.tsx` |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | code | Расширение схемы IndexedDB новым store-ом `chat_messages` (миграция через bump version в `idb`) |

Никаких изменений в `app/controllers/`, `db/`, `config/` (backend) не ожидается.

### Flow

1. Пользователь открывает страницу видео `/videos/:id`. Компонент Show.tsx рендерится; в правой колонке десктопного layout появляется `ChatPanel`.
2. `ChatPanel` при mount читает `chat_messages` для `videoId` из IndexedDB, восстанавливает историю (если она была).
3. Пользователь выбирает провайдера, вводит API-ключ (можно «запомнить» через чекбокс).
4. Если у видео есть `subtitles`, чекбокс «контекст транскрипта подключён» включён по умолчанию.
5. Пользователь набирает вопрос в input, нажимает «Отправить».
6. `client.chat(...)` собирает messages: `[system: 'Ты помогаешь анализировать видео...', system: '<transcript>'?, ...history, user: '<вопрос>']`, делегирует в адаптер провайдера.
7. Адаптер выполняет fetch к API провайдера, нормализует ответ или бросает `ChatError`.
8. ChatPanel показывает ответ ассистента в истории, сохраняет обновлённую историю в IndexedDB.
9. При ошибке — у последнего user-сообщения появляется красная плашка с текстом ошибки и кнопкой «Повторить».
10. Пользователь сворачивает панель toggle-ом — история и input сохраняются.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Input: `{ provider: ChatProvider, apiKey: string, model?: string, messages: ChatMessage[], transcript?: string, signal?: AbortSignal }`. Output: `Promise<{ message: ChatMessage }>` где `ChatMessage = { role: 'system' \| 'user' \| 'assistant', content: string }`. | Producer: `client.ts`; Consumer: `ChatPanel.tsx` | Router. Никогда не возвращает `null`/`undefined`; на ошибке бросает `ChatError`. `model` — опциональный override; если не указан, используется `providerDefaultModel(provider)`. `transcript` (если передан) автоматически вкладывается в system-message **до** истории сообщений в адаптере. |
| `CTR-02` | Адаптер провайдера: `(input: ProviderInput) => Promise<ProviderOutput>`. Все адаптеры экспортируют одну сигнатуру. Расширение — новый файл `providers/<name>.ts` + регистрация в `providers/index.ts`. | Producer: `providers/<name>.ts`; Consumer: `client.ts` | Контракт расширения. Добавление провайдера НЕ требует изменения `client.ts` — только запись в `PROVIDERS` map. |
| `CTR-03` | Input: `subtitlesFile: File \| null`. Output: `Promise<string \| null>` — plain text транскрипта (склеенный из cues, без таймкодов) или `null`, если VTT отсутствует/невалиден. | Producer: `context.ts`; Consumer: `client.ts` (через ChatPanel) | Использует существующий `parseVtt`. Если parse возвращает `status: 'invalid'` — функция возвращает `null`, не бросает. Truncation на максимальную длину (см. `FM-03`) применяется здесь. |
| `CTR-04` | IndexedDB store `chat_messages`. Schema: `{ videoId: string (key), messages: ChatMessage[], updatedAt: number }`. CRUD: `getMessages(videoId)`, `appendMessage(videoId, msg)`, `clearMessages(videoId)`. | Producer: `storage.ts`; Consumer: `ChatPanel.tsx` | Доступ через тот же `idb`-инстанс, что в существующем `features/videos/storage.ts`. Создание store-а — миграция через `upgrade` callback при bump-е версии. |

### Failure Modes

- `FM-01` Неверный API-ключ → провайдер возвращает 401/403 → адаптер бросает `ChatError({ code: 'invalid_api_key' })` → панель показывает «Проверьте API-ключ» рядом с user-сообщением.
- `FM-02` Network/CORS → fetch падает с `TypeError` → `ChatError({ code: 'network' })` → «Не удалось выполнить запрос. Возможны проблемы сети или CORS».
- `FM-03` Транскрипт слишком длинный для модели (видео >2 часов) → если `transcript.length > MAX_CONTEXT_CHARS` (захардкоженный лимит, например 80000 символов), `context.ts` отрезает по последним символам и добавляет в system message пометку «контекст обрезан до последних N символов из M». Запрос **отправляется**, но пользователь видит индикатор обрезки.
- `FM-04` Провайдер вернул 200 с пустым/неожиданным телом → `ChatError({ code: 'invalid_response' })` → «Провайдер вернул некорректный ответ».
- `FM-05` Rate-limit (429) → `ChatError({ code: 'rate_limit', retryAfterSeconds? })` → «Достигнут лимит запросов; попробуйте через N секунд».
- `FM-06` IndexedDB недоступен (приватный режим, переполнено хранилище) → `storage.ts` логирует ошибку, история живёт только в state, ChatPanel показывает ненавязчивое уведомление «История сообщений не сохраняется в этом браузере».

## Verify

`Verify` задаёт canonical test case inventory для delivery-единицы: positive scenarios через `SC-*`, feature-specific negative coverage через `NEG-*`, executable checks через `CHK-*` и evidence через `EVID-*`.

### Exit Criteria

- `EC-01` На странице видео есть отдельная панель чата, её можно сворачивать/разворачивать одним control-ом, и сворачивание не теряет историю / введённый текст.
- `EC-02` Через панель можно отправить сообщение хотя бы одному из MVP-провайдеров (OpenAI / Anthropic / Groq) и получить ответ; смена провайдера в выпадающем списке корректно меняет адресуемый API.
- `EC-03` Если у видео есть субтитры, текст транскрипта подмешивается в запрос к LLM (виден в network log как часть тела system message), и пользователь видит индикатор «контекст транскрипта подключён».
- `EC-04` История сообщений сохраняется между перезагрузками страницы для одного и того же видео (IndexedDB persistence).
- `EC-05` При ошибке провайдера (invalid key / network / rate-limit) пользователь видит понятное сообщение и может повторить отправку без перезагрузки.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `DEC-04`, `CON-02`, `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `DEC-04`, `CON-02` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-03` | `DEC-01`, `CTR-02` | `EC-02`, `SC-02` | `CHK-02`, `CHK-03` | `EVID-02`, `EVID-03` |
| `REQ-04` | `ASM-03`, `CON-04` | `EC-02` | `CHK-01` | `EVID-01` |
| `REQ-05` | `DEC-02`, `ASM-02`, `CTR-03` | `EC-03`, `SC-04` | `CHK-04` | `EVID-04` |
| `REQ-06` | `CON-02`, `CTR-01` | `EC-01`, `EC-05`, `SC-01`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-07` | `DEC-03`, `CTR-04` | `EC-04`, `SC-05` | `CHK-05` | `EVID-05` |
| `REQ-08` | `FM-01`, `FM-02`, `FM-04`, `FM-05`, `CTR-01` | `EC-05`, `NEG-01`, `NEG-02` | `CHK-02`, `CHK-06` | `EVID-02`, `EVID-06` |

### Acceptance Scenarios

- `SC-01` Happy path (UI): открыть страницу видео с сохранёнными субтитрами → справа от субтитров появляется панель чата с input-ом и dropdown провайдера → нажать toggle → панель сворачивается; нажать снова → разворачивается с тем же state.
- `SC-02` Смена провайдера: ввести API-ключ для OpenAI, отправить сообщение → получить ответ; переключить dropdown в Anthropic, ввести соответствующий ключ, отправить — получить ответ от другого провайдера. В network log видны разные хосты.
- `SC-03` Empty state: открыть страницу видео без сообщений → в панели видна пустая история и hint «Задайте вопрос по содержимому видео».
- `SC-04` Контекст транскрипта: открыть видео с субтитрами → checkbox «контекст транскрипта» включён по умолчанию → отправить сообщение → в network-log тело запроса содержит текст транскрипта в system-message; снять чекбокс → следующее сообщение отправляется без транскрипта.
- `SC-05` Persistence: отправить 2-3 сообщения, перезагрузить страницу того же видео → история восстанавливается из IndexedDB и видна в панели.

### Negative / Edge Cases

- `NEG-01` Invalid API key: ввести заведомо невалидный ключ, отправить сообщение → провайдер возвращает 401 → у user-сообщения появляется красная плашка «Проверьте API-ключ» с кнопкой «Повторить».
- `NEG-02` Network error: блокировать DNS/сеть к `api.openai.com` (например, через DevTools throttling «offline»), отправить сообщение → `TypeError` → плашка «Не удалось выполнить запрос…».
- `NEG-03` IndexedDB недоступен (открыть страницу в приватном режиме браузера, где IDB либо отсутствует, либо ограничен) → панель работает, история живёт в state, появляется уведомление «История не сохраняется в этом браузере».
- `NEG-04` Транскрипт длиннее `MAX_CONTEXT_CHARS`: передать в `context.ts` искусственный VTT длиной >80000 символов → функция возвращает обрезанный текст с пометкой; в логе видно сообщение об обрезке.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-05`, `SC-01`, `SC-03` | Playwright-сценарии: открытие страницы видео, скриншоты состояний (пустая панель, ввод текста, отправка, получение ответа, свёрнутое/развёрнутое состояние). API-ключ — тестовый sandbox или mock через intercept. | Панель рендерится / сворачивается / разворачивается; история отображается; ошибка показывается ясно | `artifacts/ft-020/verify/chk-01/` |
| `CHK-02` | `CTR-01`, `CTR-02`, `REQ-03`, `REQ-08`, `FM-01`, `FM-02`, `FM-04`, `FM-05` | Vitest unit-тесты в `features/videos/chat/`: (a) router `client.chat` диспетчеризует в правильный адаптер; (b) каждый адаптер OpenAI/Anthropic/Groq нормализует успешный ответ; (c) каждый адаптер маппит 401/403/429/network ошибки в коды `ChatError`. `fetch` мокается через `vi.fn()`. | Все unit-тесты зелёные локально (Docker) и в CI | `artifacts/ft-020/verify/chk-02/` |
| `CHK-03` | `EC-02`, `SC-02` | Playwright-сценарий: переключение провайдера в dropdown → проверка через `page.on('request')`, что хост запроса меняется (`api.openai.com` → `api.anthropic.com`). | Запросы уходят на правильные хосты при переключении провайдера | `artifacts/ft-020/verify/chk-03/` |
| `CHK-04` | `CTR-03`, `REQ-05`, `FM-03`, `NEG-04` | Vitest unit-тесты: `extractTranscriptText(File)` возвращает plain text без таймкодов; truncation работает на длинных входах; `null` для невалидного/отсутствующего VTT. | Все unit-тесты зелёные | `artifacts/ft-020/verify/chk-04/` |
| `CHK-05` | `CTR-04`, `REQ-07`, `EC-04`, `SC-05` | Vitest интеграционный тест с `fake-indexeddb`: запись сообщений → чтение → проверка persistence; `clearMessages` чистит per-video. | Все тесты зелёные | `artifacts/ft-020/verify/chk-05/` |
| `CHK-06` | `REQ-08`, `EC-05`, `NEG-01`, `NEG-02` | Playwright-сценарий: подсунуть невалидный ключ → assertion на красную плашку у последнего user-сообщения с текстом «Проверьте API-ключ»; throttle network → assertion на сообщение про network. | Корректные пользовательские формулировки ошибок | `artifacts/ft-020/verify/chk-06/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-020/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-020/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-020/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-020/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-020/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-020/verify/chk-06/` |

### Evidence

- `EVID-01` Playwright-скриншоты UI-состояний панели чата: `artifacts/ft-020/verify/chk-01/panel-empty.png`, `panel-with-history.png`, `panel-collapsed.png`, `panel-input-error.png` + `playwright-assertions.log`.
- `EVID-02` Vitest-лог unit-тестов router-а и провайдер-адаптеров: `artifacts/ft-020/verify/chk-02/vitest.log`. Должен содержать assertions по всем 4 ошибочным кодам (`invalid_api_key`, `network`, `rate_limit`, `provider_error`).
- `EVID-03` Playwright-лог запросов при смене провайдера: `artifacts/ft-020/verify/chk-03/network-trace.log`, скриншоты `provider-openai-selected.png`, `provider-anthropic-selected.png`.
- `EVID-04` Vitest-лог unit-тестов `context.ts`: `artifacts/ft-020/verify/chk-04/vitest.log`. Покрывает извлечение plain-text, truncation, null для invalid VTT.
- `EVID-05` Vitest-лог `storage.ts` с `fake-indexeddb`: `artifacts/ft-020/verify/chk-05/vitest.log`.
- `EVID-06` Playwright-сценарий ошибок: `artifacts/ft-020/verify/chk-06/error-invalid-key.png`, `error-network.png`, `playwright-assertions.log`.
- `EVID-CI-LOCAL-01` Local Docker CI после реализации: `artifacts/ft-020/verify/chk-02/local-docker-ci.md`.
- `EVID-CI-REMOTE-01` GitHub Actions CI для PR: `artifacts/ft-020/verify/chk-02/remote-ci.md`.
- `EVID-PR-01` PR closure: `artifacts/ft-020/reviews/pr-created.md`.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Playwright-скриншоты UI-состояний панели чата (пустое, с историей, свёрнутое, ввод-ошибка) | verify-runner (Playwright) / human | `artifacts/ft-020/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Лог Vitest unit-тестов: router + 3 провайдер-адаптера + маппинг ошибок | verify-runner (Docker `bin/ci`) / human | `artifacts/ft-020/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Playwright network-trace при переключении провайдера + скриншоты dropdown | verify-runner (Playwright) / human | `artifacts/ft-020/verify/chk-03/` | `CHK-03` |
| `EVID-04` | Vitest unit-тесты `context.ts` (extract + truncation + null) | verify-runner (Docker `bin/ci`) / human | `artifacts/ft-020/verify/chk-04/` | `CHK-04` |
| `EVID-05` | Vitest unit-тесты `storage.ts` с fake-indexeddb | verify-runner (Docker `bin/ci`) / human | `artifacts/ft-020/verify/chk-05/` | `CHK-05` |
| `EVID-06` | Playwright error-сценарии (invalid_api_key, network) | verify-runner (Playwright) / human | `artifacts/ft-020/verify/chk-06/` | `CHK-06` |
