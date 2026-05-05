# Acceptance walkthrough — FT-020

Дата: 2026-05-05
Контур: local Docker compose (`docker compose -f docker/docker-compose.yml`).
Ветка: `FT-020-ai-chat` @ commit `793e26b` (impl) + `3b3fbe0` (state-pack).
Статус Playwright: manual gap (`AG-01`) — **подтверждён в плане**, deterministic UI evidence будет собран отдельно через `playwright-cli` skill при наличии живых API-ключей провайдеров.

## EC-01 — отдельная панель чата, сворачиваемая, не теряет state

**Source:** feature.md `## Verify > Exit Criteria > EC-01`.

Проверка через Vitest component-tests (`spec/frontend/features/videos/chat/`) и интеграционный smoke в `Show.test.tsx`:

- [✓] `ChatPanel` импортируется и рендерится в `Show.tsx` рядом с `SubtitlesPanel` (verified by `Show.test.tsx` 6/6 passed).
- [✓] toggle-кнопка существует и имеет уникальный текст «Скрыть чат / Показать чат», не конфликтует с SubtitlesPanel toggle. Verified: `app/frontend/features/videos/chat/ChatPanel.tsx:189` + Show.test.tsx все ассерты `getByRole('button', { name: 'Скрыть панель' })` остались валидными.
- [✓] `data-chat-panel` присутствует на корне `<aside>`. Verified: `ChatPanel.tsx:165`.
- [✓] toggle через `useState`, `history` отдельным `useState` — сворачивание не сбрасывает массив `history` (effect `[videoId]` сбрасывает только draft/error/busy, см. `ChatPanel.tsx:78-85`).

**Result:** EC-01 PASS на уровне unit/component. Полноценный visual evidence — Playwright skill (manual gap, `AG-01`).

## EC-02 — отправка сообщения через router; смена провайдера меняет API host

**Source:** EC-02.

Проверка через `client.test.ts`:

- [✓] OpenAI: запрос на `https://api.openai.com/v1/chat/completions`, header `Authorization: Bearer ...`. (`client.test.ts:62-72`)
- [✓] Anthropic: запрос на `https://api.anthropic.com/v1/messages`, header `x-api-key` + `anthropic-version` + `anthropic-dangerous-direct-browser-access: true`. System message выносится из `messages` в отдельное поле `system` (митигация ER-01). (`client.test.ts:74-96`)
- [✓] Groq: запрос на `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compat path). (`client.test.ts:98-105`)
- [✓] router использует `providerDefaultModel(provider)` если `model` не передан, иначе override. (`client.test.ts:179-194`)

**Result:** EC-02 PASS на уровне unit. Реальный network-trace со сменой провайдера — Playwright (AG-01).

## EC-03 — транскрипт подмешивается в system message

**Source:** EC-03.

Проверка через `client.test.ts` + `context.test.ts`:

- [✓] Когда `transcript` передан, router добавляет system message с TRANSCRIPT_PREAMBLE + текст транскрипта **перед** историей. (`client.test.ts:107-122`)
- [✓] Когда `transcript` не передан / null — system message не добавляется, первое сообщение `user`. (`client.test.ts:124-131`)
- [✓] `extractTranscriptText(File)` возвращает plain text из VTT через `parseVtt`, без таймкодов. (`context.test.ts:30-37`)
- [✓] Truncation FM-03 работает: транскрипт >MAX_CONTEXT_CHARS обрезается по концу + добавляется notice `[transcript truncated, last N chars of M]`. (`context.test.ts:39-58`)
- [✓] Возврат null для отсутствующего/невалидного/пустого VTT. (`context.test.ts:11-28, 60-65`)
- [✓] UI: `ChatPanel` имеет чекбокс «Контекст транскрипта подключён», disabled если VTT нет. (`ChatPanel.tsx:241-251`)

**Result:** EC-03 PASS на уровне unit. Network-body inspection — Playwright (AG-01).

## EC-04 — история сохраняется между перезагрузками (IndexedDB)

**Source:** EC-04.

Проверка через `storage.test.ts`:

- [✓] `getMessages('v-1')` возвращает `[]` для пустого store. (`storage.test.ts:78-81`)
- [✓] `appendMessage` персистит, `getMessages` читает в правильном порядке. (`storage.test.ts:83-91`)
- [✓] `setMessages` перезаписывает всю историю. (`storage.test.ts:93-98`)
- [✓] `clearMessages` чистит per-video, не задевая другие видео. (`storage.test.ts:100-107`)
- [✓] Миграция IDB version 1→2 — additive (`storage.ts:40-50`): `if (!db.objectStoreNames.contains(...))` для обоих stores. ER-02 закрыт.

**Result:** EC-04 PASS на уровне unit с stub IDB. Real IDB persistence between page reloads — manual UI test или Playwright (AG-01).

## EC-05 — ошибка провайдера показывается ясно, можно повторить

**Source:** EC-05.

Проверка через `client.test.ts` + `ChatPanel.tsx`:

- [✓] 401/403 → `ChatError({ code: 'invalid_api_key' })`. (`client.test.ts:133-143`)
- [✓] network failure (`TypeError`) → `ChatError({ code: 'network' })`. (`client.test.ts:145-154`)
- [✓] 429 + `retry-after` → `ChatError({ code: 'rate_limit', retryAfterSeconds: 5 })`. (`client.test.ts:156-164`)
- [✓] non-2xx + body → `ChatError({ code: 'provider_error', status })`. (`client.test.ts:166-171`)
- [✓] 200 + пустой content → `ChatError({ code: 'invalid_response' })`. (`client.test.ts:173-177`)
- [✓] UI: при ошибке появляется plate `[role="alert"][data-chat-error]` рядом с failed user message + кнопка «Повторить» (`ChatPanel.tsx:309-326`).
- [✓] Retry: повторно вызывает `handleSend` без append нового user message (`ChatPanel.tsx:148-175`).

**Result:** EC-05 PASS на уровне unit. Visual screenshot of error plate — Playwright (AG-01).

## Сводка

| Exit Criterion | Status | Evidence |
|---|---|---|
| EC-01 (toggle сохраняет state) | PASS (unit/component) | `chk-02/full-vitest.log` (Show.test 6/6) + ChatPanel.tsx code review |
| EC-02 (3 провайдера, разные хосты) | PASS (unit) | `chk-02/vitest.log` client.test.ts 17 cases |
| EC-03 (транскрипт в system) | PASS (unit) | `chk-04/vitest.log` context+client tests |
| EC-04 (history persistence) | PASS (unit с stub IDB) | `chk-05/vitest.log` storage.test.ts |
| EC-05 (ошибки + retry) | PASS (unit) | `chk-02/vitest.log` error mapping cases |

Все 5 EC закрыты на уровне unit/component coverage. UI evidence через Playwright (CHK-01, CHK-03, CHK-06) — отложен по `AG-01` (manual gap, approve в плане), как и в FT-019. Это сознательное ограничение repo: Playwright harness в репозитории не поднят.
