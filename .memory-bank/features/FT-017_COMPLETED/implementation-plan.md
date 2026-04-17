---
title: "FT-017: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-017. Фиксирует discovery context, шаги, риски и test strategy без переопределения canonical feature-фактов."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_017_scope
  - ft_017_architecture
  - ft_017_acceptance_criteria
  - ft_017_blocker_state
---

# План имплементации

## Цель текущего плана

Реализовать FT-017: пользователь может транскрибировать загруженное видео через OpenAI/Groq, получить `.vtt` с таймкодами и сохранить его в `IndexedDB` как субтитры для видео, с overwrite guard и обработкой ошибок, плюс минимальные unit-тесты для client-side провайдер-клиента.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | Страница просмотра видео: загрузка record из IndexedDB, загрузка/скачивание `.vtt`, toggle показа субтитров | FT-017 добавляет UI и запуск транскрибации на этой странице | Переиспользовать существующие `setSubtitles(...)`, `downloadSubtitles`, `subtitlesEnabled`-паттерны |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | IndexedDB storage для видео и субтитров (`StoredVideoRecord.subtitles?: File`) | FT-017 должен сохранять `.vtt` как `File` именно через этот слой | Использовать `setSubtitles(id, file)` без расширения schema |
| `video_chat_and_translator/package.json` | `vitest` и `@testing-library/*` доступны, `npm test` = `vitest run` | FT-017 требует `CHK-02` (unit tests) | Принять `vitest` как основной runner для client-side логики |
| `.memory-bank/features/FT-017/feature.md` | Canonical scope/verify/NEG/CHK/EVID | План не должен переопределять требования | Ссылаться на `REQ-*`, `SC-*`, `CHK-*` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UI flow (provider/key/transcribe/save/show) | `SC-01`, `CHK-01`, `EVID-01` | Нет | (опционально позже) UI tests; в рамках FT-017 — manual acceptance + screenshots | Human: запустить приложение в devcontainer и пройти `SC-01` | Parity с CI: `scripts/ci-app.sh` (docker + `bin/ci`) зелёный на PR | UI e2e сложны/хрупки, принимаем manual evidence | `AG-02` |
| Provider client (request building + error normalization) | `SC-04`, `CHK-02`, `EVID-02` | Нет | Vitest unit tests для: preflight oversize, 401/403, network error, invalid response | Human: `npm test` (в devcontainer) | Parity с CI: `scripts/ci-app.sh` (docker + `bin/ci`) зелёный на PR | `none` | `none` |
| Overwrite guard (не перезаписывать без явного подтверждения) | `SC-02`, `NEG-03`, `CHK-03`, `EVID-03` | Нет | Unit tests для pure guard-логики (если выделена) + manual UI proof | Human: пройти `SC-02` в UI | Parity с CI: `scripts/ci-app.sh` (docker + `bin/ci`) зелёный на PR | В UI требуется manual evidence, т.к. поведение зависит от интеграции с состоянием страницы | `AG-02` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Какие точные параметры запроса нужны для `.vtt` у OpenAI и Groq (имена моделей, `response_format`, поле для file) | Детали API могут отличаться между провайдерами | `STEP-02` | Default: реализовать OpenAI-compatible client с параметрами `{ model, file, response_format: 'vtt' }`; если провайдер не поддерживает — эскалация в `feature.md` через `DEC-*` update (owner: human) |
| `OQ-02` | Какой лимит размера считать preflight-лимитом по умолчанию | Провайдер-лимиты различаются и могут меняться | `STEP-01`, `STEP-02` | Default: ввести per-provider map (например `providerMaxBytes`) и держать значение по умолчанию равным более строгому лимиту (ориентировочно 25MB) |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Devcontainer окружение проекта, фронтенд собирается через текущий toolchain (Vite) | все шаги | Любая попытка verify “на хосте” даёт несовпадения зависимостей/окружения |
| test | Parity с CI/Docker: эталонный прогон — `scripts/ci-app.sh` (docker compose CI stack + `bin/ci`). Для фронтенд unit-тестов допускается локальный прогон в devcontainer через `npm test` (=`vitest run`) и `npm run check` | `CHK-02`, `STEP-05` | CI прогон (`scripts/ci-app.sh`) красный или фронтенд тесты/типчек не запускаются |
| access / network / secrets | Запросы к провайдерам выполняются из браузера, ключ вводится пользователем и не должен уходить на Rails | `STEP-03`, `SC-01` | Появились сетевые ошибки/CORS; необходимо UI сообщение согласно `CON-04` |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `DEC-01` | Провайдеры для релиза: OpenAI + Groq | `STEP-01`..`STEP-04` | yes |
| `PRE-02` | `DEC-02` | Ключ хранится in-memory по умолчанию; optional localStorage | `STEP-03` | yes |
| `PRE-03` | `ASM-01` | Целевой формат ответа `.vtt` с таймкодами | `STEP-02`..`STEP-04` | yes |
| `PRE-04` | `ASM-03` | До начала execution code changes создана feature-ветка, запушена и открыт PR (PR-first) | `STEP-00`..`STEP-05` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-02`, `CTR-03` | Provider client + нормализация ошибок + preflight oversize | agent | `PRE-01`, `PRE-03` |
| `WS-2` | `REQ-01`, `REQ-05`, `CON-04` | UI: выбор провайдера, ввод ключа, remember-key toggle, overwrite guard, состояния loading/error/success | agent | Контракт `WS-1` (сигнатура `transcribeToVtt(...)` + типы ошибок) |
| `WS-3` | `REQ-03`, `REQ-04`, `ASM-02` | Сохранение `.vtt` через `setSubtitles` + существующие toggle/download | agent | `WS-2` |
| `WS-4` | `EC-04`, `CHK-02` | Vitest tests для `WS-1` (и guard-логики если выделена) | agent | `WS-1` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Потребуется увеличить IndexedDB `DB_VERSION`, изменить `keyPath` или добавить новый object store | `WS-3` | Это изменение storage контракта и повышает риск потери данных/несовместимости | human approval (чат/issue) |
| `AG-02` | Manual-only acceptance для UI (скриншоты/evidence вместо e2e) | `CHK-01`, `CHK-03` | Plan gate требует явного approve manual-only gaps | Approver: human; evidence: `EVID-REVIEW-01` этого плана |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-00` | human | PR-first | Создать ветку, push и открыть PR до начала execution changes | git/GitHub | PR URL | — | `EVID-REVIEW-01` | Открыть PR, добавить ссылки на `feature.md` и `implementation-plan.md`, затем записать PR URL в `artifacts/ft-017/reviews/pr-created.md` | `PRE-04` | `none` | Если PR не удаётся создать из окружения — эскалация |
| `STEP-01` | agent | `REQ-02` | Определить provider-specific preflight policy (max bytes per provider) и типы ошибок | `app/frontend/features/videos/transcription/*` (new) | Конфиг лимитов + error types | `CHK-02` | `EVID-02` | Human runs `npm run check` (tsc) в devcontainer; parity gate — `scripts/ci-app.sh` на PR | `PRE-01` | `none` | Если лимиты требуют изменения scope (например audio-extract) → эскалация в `feature.md` |
| `STEP-02` | agent | `REQ-02`, `CTR-02`, `CTR-03` | Реализовать OpenAI-compatible client для OpenAI/Groq: POST multipart, `response_format=vtt`, нормализовать ошибки (предполагая `ASM-01`) | `app/frontend/features/videos/transcription/*` (new) | `transcribeToVtt(...)` API | `CHK-02` | `EVID-02` | Human runs `npm run check` (tsc) в devcontainer | `OQ-01` | `none` | Если провайдер не поддерживает `.vtt` напрямую → эскалация (scope/DEC update) |
| `STEP-03` | agent | `REQ-01`, `REQ-05`, `CON-04`, `NS-07`, `SC-02`, `SC-03` | Добавить UI на `VideosShow`: provider select, API key input, remember toggle, overwrite checkbox, loading/error states, privacy hint | `pages/videos/Show.tsx` | UI блок “Транскрибация” | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | Human проходит `SC-01`..`SC-03` | `PRE-02` | `none` | Если требуется глобальный state/props refactor (Inertia) → эскалация |
| `STEP-04` | agent | `REQ-02`, `REQ-03`, `REQ-04` | Интегрировать вызов клиента: по success получить `.vtt`, создать `File`, сохранить через `setSubtitles`, обновить UI state | `Show.tsx`, `storage.ts` (reuse) | Сохранение `.vtt` в IndexedDB | `CHK-01` | `EVID-01` | Human: скачать `.vtt`, включить subtitles toggle | `PRE-03` | `none` | Если `setSubtitles` не подходит (формат/тип) → эскалация (storage contract change) |
| `STEP-05` | agent | `CHK-02`, `EC-04` | Добавить Vitest unit tests для transcription клиента и нормализации ошибок | `transcription/__tests__/*` (new) | Тесты | `CHK-02` | `EVID-02` | Human runs `npm test` (devcontainer); parity gate — `scripts/ci-app.sh` на PR | `STEP-02` | `none` | Если тестовый раннер/конфиг отсутствует → эскалация в build setup |

## Parallelizable Work

- `PAR-01` `WS-1` (provider client) и `WS-2` (UI) можно начать параллельно, если UI использует интерфейс-заглушку `transcribeToVtt(...)` и типы ошибок зафиксированы.
- `PAR-02` `WS-3` (storage integration) лучше делать после стабилизации контракта `WS-1`, иначе будет churn по типам/ошибкам.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-05`, `CHK-02` | Unit tests для клиента есть и зелёные | `EVID-02` |
| `CP-02` | `STEP-04`, `SC-01`, `CHK-01` | Happy path сохраняет `.vtt` и он отображается в плеере | `EVID-01` |
| `CP-03` | `SC-02`, `SC-03`, `CHK-03` | Negatives не перезаписывают субтитры и показывают ошибки | `EVID-03` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | CORS/сетевые блокировки при прямых запросах из браузера | FT-017 может быть неприемлем на части окружений | Явное UI сообщение (см. `CON-04`) + документация ограничений в error UI | Ошибки `TypeError: Failed to fetch` / CORS в консоли |
| `ER-02` | Большие файлы видео не проходят лимиты провайдера | Нельзя транскрибировать типичные пользовательские видео | Preflight oversize + понятный UX и follow-up фича на audio-extract | Видео > лимита |
| `ER-03` | Провайдер не поддерживает `.vtt` напрямую | Нарушение `ASM-01`/`REQ-02` | Эскалация: обновить `feature.md` (DEC/ASM) и выбрать альтернативный формат/конвертацию | Ответ только в text/json |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `AG-01` | Требуется миграция/изменение схемы хранения | Остановиться и запросить approval | Без изменений в storage; оставить только текущий ручной upload `.vtt` |
| `STOP-02` | `OQ-01`, `ASM-01` | Нельзя получить `.vtt` с таймкодами без изменения assumptions | Остановиться и обновить `feature.md` через ревью | Не реализовывать “text-only subtitles” (невалидно для `.vtt`) |

## Готово для приемки

План считается выполненным, когда выполнены `CP-01`..`CP-03`, а evidence-артефакты соответствуют секции `Verify` в `.memory-bank/features/FT-017/feature.md`.

`EVID-REVIEW-01`: Approved by project owner in chat (2026-04-17). Persisted at `artifacts/ft-017/reviews/plan-approved.md`.
