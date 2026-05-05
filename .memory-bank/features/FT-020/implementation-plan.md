---
title: "FT-020: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-020 (AI-чат с видео). Фиксирует discovery context, последовательность шагов, риски и test strategy без переопределения canonical feature-фактов."
derived_from:
  - feature.md
status: draft
audience: humans_and_agents
must_not_define:
  - ft_020_scope
  - ft_020_architecture
  - ft_020_acceptance_criteria
  - ft_020_blocker_state
---

# План имплементации

## Цель текущего плана

Реализовать новый client-side feature-модуль `app/frontend/features/videos/chat/` (router + 3 провайдер-адаптера + storage + context-helper + ChatPanel), интегрировать панель чата в `pages/videos/Show.tsx` рядом с панелью субтитров и собрать evidence по `CHK-01..CHK-06` без изменения серверной части и без введения новых UI-библиотек, в соответствии с canonical scope `feature.md`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | Страница видео: рендерит плеер, transcription panel и `SubtitlesPanel` | Основной change surface: добавляется `ChatPanel` в трёхколоночный layout; reuse `videoRef`, `record.subtitles` | Переиспользовать паттерн чтения `StoredVideoRecord` через `findVideo(id)`, паттерн «провайдер + apiKey + remember-checkbox» из transcription-блока |
| `video_chat_and_translator/app/frontend/features/videos/transcription/` | Существующий feature-модуль: `client.ts`, `types.ts`, `errors.ts`, провайдер-адаптеры | Эталон архитектуры для нового `chat/`: разделение router/адаптеры/типы/ошибки уже отработано | Зеркалить структуру: `client.ts` + `providers/*` + `errors.ts` + `index.ts` |
| `video_chat_and_translator/app/frontend/features/videos/subtitles/vtt.ts` | Pure-функция парсинга VTT в `Segment[]` | `CTR-03` requires plain-text транскрипт из VTT — переиспользуем `parseVtt`, не дублируя | Импорт `parseVtt` в новом `context.ts` |
| `video_chat_and_translator/app/frontend/features/videos/subtitles/SubtitlesPanel.tsx` | Сворачиваемая панель с `isOpen`/`onToggle` props | Визуальный и UX эталон для `ChatPanel` (по `DEC-04`) | Скопировать паттерн toggle/empty/error states |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | IndexedDB: `videos` store + helpers `findVideo`/`setSubtitles` | `CTR-04` extends схему БД новым store-ом `chat_messages`; необходимо bump version + `upgrade` callback | Расширить тот же файл, не плодить параллельные DB-инстансы |
| `video_chat_and_translator/spec/frontend/features/videos/transcription/*.test.ts` | Vitest-coverage транскрипции (ошибки, mock fetch, нормализация ответа) | Локальный паттерн для тестов router/адаптеров чата | Зеркалить стиль: table-like fixtures, mocked `fetch`, deterministic assertions |
| `video_chat_and_translator/package.json` | Установлены `vitest`, `@testing-library/react`, `fake-indexeddb`, `npm test`, `npm run check` | План опирается на существующий test stack | Unit-coverage через Vitest; UI evidence — Playwright-skill, как в FT-019 |
| `.memory-bank/features/FT-020/feature.md` | Canonical scope, contracts (`CTR-01..04`), verify (`CHK-01..06`), evidence | План не имеет права переопределять requirements, только sequencing | Ссылаться на `REQ-*`, `CTR-*`, `FM-*`, `CHK-*`, `EVID-*` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Router `client.ts` + 3 провайдер-адаптера | `CTR-01`, `CTR-02`, `REQ-03`, `REQ-08`, `FM-01`, `FM-02`, `FM-04`, `FM-05`, `CHK-02` | Нет | Vitest unit-тесты: dispatch в правильный адаптер; нормализация успешного ответа для OpenAI/Anthropic/Groq; маппинг 401/403/429/network в `ChatError` с правильным кодом | `docker compose -f docker/docker-compose.yml run --rm web npm test`; `... npm run check` | GitHub Actions `App checks (Docker)` | none | none |
| `context.ts` (extract transcript + system message) | `CTR-03`, `REQ-05`, `FM-03`, `NEG-04`, `CHK-04` | Нет | Vitest unit-тесты: extract plain-text из VTT через `parseVtt`; truncation на длинных входах; null для invalid/missing VTT | `... npm test`; `... npm run check` | GitHub Actions `App checks (Docker)` | none | none |
| `storage.ts` (IndexedDB chat_messages) | `CTR-04`, `REQ-07`, `EC-04`, `NEG-03`, `CHK-05` | Нет (но есть паттерн в `videos`-store) | Vitest интеграция с `fake-indexeddb`: `getMessages` → пустой массив; `appendMessage` + `getMessages` → правильный порядок; `clearMessages` чистит per-video; миграция при bump version не теряет существующие video-записи | `... npm test` | GitHub Actions `App checks (Docker)` | none | none |
| `ChatPanel.tsx` UI integration | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-06`, `REQ-08`, `CHK-01`, `CHK-06` | Нет | Component-level Vitest: render с историей и без, toggle сохраняет state, error plate появляется на failed send, retry-кнопка триггерит повторный fetch (mocked) | `... npm test` | GitHub Actions `App checks (Docker)` | none | none |
| `Show.tsx` integration | `REQ-01`, `EC-01` | Есть базовое coverage upload/transcription/subtitles | Расширить `Show.test.tsx`: `ChatPanel` рендерится при mount, не ломает существующий рендер `SubtitlesPanel` и transcription block | `... npm test` | GitHub Actions `App checks (Docker)` | none | none |
| UI evidence via Playwright (CHK-01, CHK-03, CHK-06) | `CHK-01`, `CHK-03`, `CHK-06`, `EVID-01`, `EVID-03`, `EVID-06` | Repo-local Playwright suite не настроен (то же ограничение, что в FT-019) | Скриншоты состояний панели + network-trace смены провайдера + error-screens; собирается через `playwright-cli` skill против Docker app | Локально: `docker compose -f docker/docker-compose.yml up`, затем `playwright-cli` для скриншотов в `artifacts/ft-020/verify/chk-01,03,06/` | CI Playwright не обязателен (как и для FT-019) | UI evidence остаётся manual/skill-driven, потому что repo-local Playwright harness отсутствует | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Использовать ли существующий ключ localStorage `ft-017:transcription_api_key:<provider>` или завести отдельный `ft-020:chat_api_key:<provider>`? | API-ключи могут совпадать (например, OpenAI для транскрипции и чата), но провайдеры могут различаться (Anthropic есть только в чате). Обмен/синхронизация ключей не зафиксирована в `feature.md`. | `STEP-04`, `STEP-05` | Default: завести отдельный namespace `ft-020:chat_api_key:<provider>` (как зафиксировано в `REQ-04`); если на review решат шарить ключи — добавить миграцию в follow-up без изменения scope этой фичи |
| `OQ-02` | Какой breakpoint использовать для трёхколоночного desktop layout? `lg`, `xl`, `2xl`? | `feature.md` фиксирует «на широких экранах» без точного breakpoint | `STEP-06` | Default: `xl` (потому что `lg` уже занят двухколоночным layout с `SubtitlesPanel`); если ревьюер настаивает на ином — поправляется до execution review без изменения scope |
| `OQ-03` | Нужны ли `data-test-*` hooks для Playwright? | `CHK-01..06` требуют детерминированной адресации DOM | `STEP-06`, `STEP-09` | Default: добавлять нейтральные `data-chat-*` (`data-chat-message-role`, `data-chat-error`, `data-chat-provider`); если ревьюер против — эскалация на review плана |
| `OQ-04` | Нужен ли `UC-*` update? | `feature-flow` требует обновления `UC-*` при изменении устойчивого сценария | весь план | Default: считать FT-020 product-level расширением «работа с видео + AI» и завести `UC-FT-020-AI-Chat` после approve плана; если на review признают feature-local — `UC-*` пропускается |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Development и verify через Docker Compose по `.memory-bank/ops/development.md`; для UI evidence app поднимается через `docker compose -f docker/docker-compose.yml up` | `STEP-08`, `STEP-09` | Страница недоступна или verify не повторяет project environment |
| unit / component tests | `docker compose -f docker/docker-compose.yml run --rm web npm test`; `... npm run check`; parity gate для PR — зелёный `bin/ci`/`App checks (Docker)` | `STEP-02`..`STEP-07`, `CHK-02..05` | Тесты зелёные только на хосте или расходятся с Docker/CI |
| unit evidence | Логи Docker/Vitest для `CHK-02..05` сохраняются в `artifacts/ft-020/verify/chk-02/`, `.../chk-04/`, `.../chk-05/` соответственно | `STEP-08` | Carrier `EVID-02/04/05` отсутствует или не соответствует contract |
| UI evidence | Скриншоты и assertion logs в `artifacts/ft-020/verify/chk-01/`, `.../chk-03/`, `.../chk-06/` | `STEP-09` | Evidence не соответствует contract |
| access / network / secrets | API-ключи провайдеров приносит пользователь в браузере; в CI — НЕ требуются (unit-тесты используют mocked `fetch`); UI-сценарии могут использовать sandbox-ключи или mock-режим | `STEP-02`..`STEP-09` | Попытка сходить за реальным ключом из CI или зашить ключ в repo |
| git / branching | До `STEP-01` ветка `FT-020-ai-chat` создана от `main`; PR-first контур существует и ссылается на `feature.md`+`implementation-plan.md` | `STEP-00`..`STEP-09` | Работа в `main` или без PR-first linkage |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-04`, `NS-05` | Архитектура остаётся client-side: запросы к LLM напрямую из браузера, никакого Rails-proxy | `STEP-01`..`STEP-09` | yes |
| `PRE-02` | `ASM-02`, `CTR-03` | `parseVtt` из `features/videos/subtitles/` сохраняет существующий контракт | `STEP-03`, `STEP-04` | yes |
| `PRE-03` | `CTR-04`, `REQ-07` | Текущий `videos`-store в IndexedDB не сломается при bump version и добавлении нового store-а `chat_messages` (миграция через `upgrade` callback) | `STEP-05` | yes |
| `PRE-04` | feature.md APPROVE на этапе spec-loop | `feature.md` прошёл feature-reviewer без замечаний | `STEP-00`..`STEP-09` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `CTR-01`, `CTR-02`, `REQ-03`, `REQ-08`, `FM-01`, `FM-02`, `FM-04`, `FM-05` | `client.ts` + `errors.ts` + `providers/{openai,anthropic,groq}.ts` + типы; pure-логика без DOM | agent | `PRE-01` |
| `WS-2` | `CTR-03`, `REQ-05`, `FM-03` | `context.ts` (extract + truncation + system message) | agent | `PRE-02` |
| `WS-3` | `CTR-04`, `REQ-07`, `NEG-03`, `FM-06` | `storage.ts` для `chat_messages` + миграция version + helpers | agent | `PRE-03` |
| `WS-4` | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-06`, `REQ-08` | `ChatPanel.tsx` + интеграция в `Show.tsx` + responsive layout | agent | `WS-1`, `WS-2`, `WS-3` |
| `WS-5` | `CHK-02`, `CHK-04`, `CHK-05` | Vitest unit/component coverage для router/context/storage/panel | agent | `WS-1`..`WS-4` |
| `WS-6` | `CHK-01`, `CHK-03`, `CHK-06`, `EVID-01`, `EVID-03`, `EVID-06` | Playwright artifacts: UI states, network trace, error screens | agent + human | `WS-4`, `AG-01` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | UI evidence по `CHK-01`/`CHK-03`/`CHK-06` остаётся manual/skill-driven (repo-local Playwright harness отсутствует, как и в FT-019) | `STEP-09` | Plan gate требует явного approve manual-only gap для verify surface | human approver; фиксируется в `EVID-REVIEW-PLAN-02` этого плана |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-00` | human | PR-first | Worktree `FT-020-ai-chat` создан из main; PR будет открыт после первого пушa с ссылками на feature.md + implementation-plan.md | git/GitHub | PR URL + linkage | — | — | Создать ветку, push после `STEP-01`, открыть PR, записать ссылку в `artifacts/ft-020/reviews/pr-created.md` | `PRE-04` | none | Если execution начинается в main, остановиться |
| `STEP-01` | agent | `CTR-01`, `CTR-02`, базовая типизация | Заморозить shared types в `features/videos/chat/types.ts`: `ChatMessage`, `ChatProvider`, `ChatResponse`, `ChatError`. Создать `errors.ts` с кодами (`invalid_api_key`, `network`, `rate_limit`, `provider_error`, `invalid_response`, `unknown`) и helper `isChatError`. | `app/frontend/features/videos/chat/types.ts`, `errors.ts`, `index.ts` | Frozen contracts | `CHK-02` | `EVID-02` | Vitest unit-тест на `isChatError(...)` | `PRE-01` | none | Если `feature.md` требует расширить набор error codes |
| `STEP-02` | agent | `CTR-02`, `REQ-03`, `FM-01`, `FM-02`, `FM-04`, `FM-05` | Реализовать `providers/openai.ts`, `providers/anthropic.ts`, `providers/groq.ts` как чистые функции `(input) => Promise<ChatResponse>` с mocked `fetch` в тестах. Каждый адаптер маппит 401/403/429/network/200-empty в правильный `ChatError`. | `app/frontend/features/videos/chat/providers/{openai,anthropic,groq}.ts`, `providers/index.ts` (registry) | Three working adapters | `CHK-02` | `EVID-02` | `... npm test` адаптеры; assertion на правильные хосты, payload format и error codes | `STEP-01` | none | Если хотя бы один провайдер требует серверный proxy (нарушит `CON-04`) |
| `STEP-03` | agent | `CTR-01`, `REQ-03`, `REQ-05` | Реализовать `client.ts` как router: принимает `{ provider, apiKey, messages, transcript? }`, диспетчеризует в `PROVIDERS[provider]`. Если `transcript` передан — вкладывает его в system message **перед** историей. | `app/frontend/features/videos/chat/client.ts` | Router | `CHK-02`, `CHK-04` | `EVID-02`, `EVID-04` | `... npm test` диспетчер: правильный провайдер вызван, transcript добавлен в начало | `STEP-02` | none | Если нужно различное поведение system-message по провайдерам |
| `STEP-04` | agent | `CTR-03`, `REQ-05`, `FM-03`, `NEG-04` | Реализовать `context.ts`: `extractTranscriptText(File): Promise<string \| null>` использует `parseVtt`; truncation `MAX_CONTEXT_CHARS = 80000` по последним символам с пометкой; null для invalid/missing VTT | `app/frontend/features/videos/chat/context.ts` | Pure helpers | `CHK-04` | `EVID-04` | `... npm test` extract; truncation; null cases | `PRE-02`, `STEP-01` | none | Если truncation strategy не подходит модели (см. `FM-03`) |
| `STEP-05` | agent | `CTR-04`, `REQ-07`, `NEG-03`, `FM-06` | Расширить `features/videos/storage.ts`: bump DB version, добавить store `chat_messages` (key=videoId, value={messages, updatedAt}), реализовать `getMessages/appendMessage/clearMessages` с graceful fallback при отсутствии IDB | `app/frontend/features/videos/storage.ts`, `features/videos/chat/storage.ts` (если решим вынести helpers в feature-модуль) | Persistent chat storage | `CHK-05` | `EVID-05` | `... npm test` storage with `fake-indexeddb`: read-write-clear; миграция version | `PRE-03`, `STEP-01` | none | Если миграция version ломает существующие video-записи |
| `STEP-06` | agent | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-06`, `REQ-08` | Реализовать `ChatPanel.tsx`: presentational+interactive (history list, input, send, provider/model/key controls, error plate, retry, toggle). DOM hooks `data-chat-*` для evidence. Работает на mocked client. | `app/frontend/features/videos/chat/ChatPanel.tsx`, `index.ts` | UI-компонент | `CHK-01`, `CHK-06` | `EVID-01`, `EVID-06` | Component Vitest: render, toggle, error plate, retry click | `STEP-03`, `STEP-04`, `STEP-05`, `OQ-03` | none | Если компонент тянет I/O или ownership `videoRef` |
| `STEP-07` | agent | `REQ-01`, `REQ-05` | Интегрировать `<ChatPanel videoId={...} subtitlesFile={record.subtitles} />` в `Show.tsx` рядом с `<SubtitlesPanel />`. Responsive: на `xl` — три колонки (видео / субтитры / чат), ниже — stacked. Не ломает existing transcription block. | `app/frontend/pages/videos/Show.tsx` | Обновлённая страница | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | `... npm test` Show.test: ChatPanel рендерится, не ломает SubtitlesPanel; manual local check responsive | `STEP-06`, `OQ-02` | none | Если layout ломает unrelated блоки |
| `STEP-08` | agent | `CHK-02`, `CHK-04`, `CHK-05` | Local Docker verify: `... npm test` + `... npm run check` зелёные. Логи в `artifacts/ft-020/verify/chk-02/`, `.../chk-04/`, `.../chk-05/`. | Docker test runner | Test logs | `CHK-02`, `CHK-04`, `CHK-05` | `EVID-02`, `EVID-04`, `EVID-05` | Docker commands из Environment Contract; копирование лога в artifacts | `STEP-07` | none | Если Docker verify расходится с CI |
| `STEP-09` | agent + human | `CHK-01`, `CHK-03`, `CHK-06` | Snapshot Playwright: панель открыта/свёрнута/empty/with-history/error-invalid-key/error-network/network-trace смены провайдера. В `artifacts/ft-020/verify/chk-01,03,06/` | Local app + Playwright skill | UI evidence | `CHK-01`, `CHK-03`, `CHK-06` | `EVID-01`, `EVID-03`, `EVID-06` | `docker compose up`, затем `playwright-cli` или эквивалент; assertions на `data-chat-*` hooks | `STEP-08`, `AG-01` | `AG-01` | Если без repo-local harness нельзя получить детерминированные артефакты |
| `STEP-10` | agent | simplify review | Проверить, что решение минимально: каждый провайдер — один файл; нет преждевременных абстракций; `chat/` не лезет в `transcription/` | touched files | Заметки в `artifacts/ft-020/reviews/simplify-review.md` | — | — | Simplify review после functional pass | `STEP-08` | none | Если код тянет общие абстракции без второй точки использования |

## Parallelizable Work

- `PAR-01` После `STEP-01` (frozen types) — `STEP-02` (адаптеры) и `STEP-04` (context) можно вести параллельно.
- `PAR-02` `STEP-05` (storage) можно начать сразу после `STEP-01`, не ждать `STEP-02..04`.
- `PAR-03` `STEP-06` (ChatPanel) требует завершения `STEP-03..05`, иначе компонент будет работать на заглушках и тесты будут хрупкими.
- `PAR-04` `STEP-09` (Playwright evidence) запускается только после `STEP-08`, иначе artifacts будут невалидными.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01..05`, `CHK-02`, `CHK-04`, `CHK-05` | Все pure-модули реализованы и покрыты unit-тестами; типы зафиксированы | `EVID-02`, `EVID-04`, `EVID-05` |
| `CP-02` | `STEP-06`, `STEP-07`, `CHK-01` | `ChatPanel` рендерится, интегрирован в `Show.tsx`, `Show.test.tsx` покрыт; не сломан существующий рендер `SubtitlesPanel` и transcription | `EVID-01` |
| `CP-03` | `STEP-08`, `STEP-09`, `CHK-03`, `CHK-06` | Local Docker verify зелёный, Playwright evidence собран по contract | `EVID-01`, `EVID-02`, `EVID-03`, `EVID-04`, `EVID-05`, `EVID-06` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Anthropic API имеет другой формат запроса/ответа (отдельный `system` параметр, `messages` без role=`system`) — наивный адаптер сложит system message в messages и провайдер вернёт ошибку | `REQ-03` сломается для Anthropic; потенциально `FM-04` срабатывает не по делу | Тщательно тестировать адаптер Anthropic с фикстурами и явно вынести `system` из массива messages в отдельное поле, как требует API | Anthropic возвращает 400 с error «system message must be in system field» |
| `ER-02` | Bump IndexedDB version ломает existing video-записи (при ошибке миграции) | Регрессия FT-016/017/019 — пользователи теряют видео | Реализовать `upgrade` callback так, чтобы он только добавлял новый store, не трогая `videos`. Покрыть `STEP-05` тестом «после миграции старые записи доступны» | Существующие тесты `findVideo`/`setSubtitles` падают после bump version |
| `ER-03` | Транскрипт >80000 символов (длинные лекции) приводит к ошибке провайдера (context length exceeded), несмотря на client-side truncation | `MET-03` не выполнен | Truncation в `context.ts` срезает по концу (последние N символов важнее для актуального контекста); пометка про обрезку видна модели | Провайдер возвращает 400 с `context_length_exceeded` |
| `ER-04` | Repo-local Playwright harness отсутствует (та же проблема, что в FT-019) — evidence остаётся manual-only | Plan Ready / Done gate может зависнуть на verify | Зафиксировать gap заранее (`AG-01`); если gap сохраняется к closure — открыть follow-up issue/ADR на repo-local Playwright harness | Невозможно воспроизвести `CHK-01/03/06` детерминированно |
| `ER-05` | Утечка API-ключа в network-логах Rails-сервера (`CON-04`) | Compliance-проблема | Покрыть `STEP-08` явной проверкой network-trace: запросы уходят только на хосты провайдеров (`api.openai.com`, `api.anthropic.com`, `api.groq.com`); ни одного запроса с `Authorization: Bearer ...` на собственный backend | Network-trace показывает заголовок `Authorization` в запросе на `localhost:3000` |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CTR-01`, `CTR-02`, `ER-01` | Контракт provider адаптера расходится с реальным API провайдера так, что нужны изменения в `CTR-01` (например, разный формат стриминга или ассистент-tools) | Остановить execution и обновить sibling `feature.md` | Не вводить ad-hoc behavior вне `CTR-01` |
| `STOP-02` | `REQ-07`, `CTR-04`, `ER-02` | Bump DB version ломает existing записи в `videos` store | Откатить миграцию, написать корректный `upgrade` callback, повторить тесты | Удержать DB version на текущем номере, пока миграция не зелёная |
| `STOP-03` | `AG-01`, `OQ-03`, `ER-04` | UI evidence нельзя собрать без расширения test infrastructure | Запросить human-decision: расширять infra или approve manual gap | Не подменять Playwright случайными ручными скриншотами без approve |
| `STOP-04` | `CON-04`, `ER-05` | Network-trace показывает API-ключ в запросе на собственный backend | Немедленно остановить execution; найти источник утечки (компонент или middleware Inertia/CSRF), починить, перепроверить | Не выпускать фичу с возможной утечкой ключа в логи Rails |

## Готово для приемки

План считается исчерпанным, когда:

- завершены `CP-01`..`CP-03`;
- собраны `EVID-01..EVID-06` по путям из sibling `feature.md`;
- local Docker verify и PR CI зелёные;
- для manual-only части `CHK-01/03/06` есть явный approve по `AG-01`;
- все canonical exit criteria `EC-01`..`EC-05` закрыты через соответствующие `CP-*` / `CHK-*`;
- по `OQ-04` явно подтверждено, нужен ли `UC-FT-020-AI-Chat`, и если да — он создан до closure;
- этот план получил review evidence и переведён из `status: draft` в `status: active`.

`EVID-REVIEW-PLAN-01`: <будет заполнен при review плана> — `artifacts/ft-020/reviews/plan-review-01.md`.
`EVID-REVIEW-PLAN-02`: <approve плана> — `artifacts/ft-020/reviews/plan-approved.md`.
`EVID-PR-01`: PR будет создан после `STEP-01` для ветки `FT-020-ai-chat`.
