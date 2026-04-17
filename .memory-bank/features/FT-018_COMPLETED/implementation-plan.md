---
title: "FT-018: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-018. Фиксирует discovery context, шаги, риски и test strategy без переопределения canonical feature-фактов."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_018_scope
  - ft_018_architecture
  - ft_018_acceptance_criteria
  - ft_018_blocker_state
---

# План имплементации

## Цель текущего плана

Реализовать stage-based прогресс транскрибации на странице видео (loading → этап → success/error) так, чтобы пользователь всегда видел, что происходит, и чтобы при любой ошибке UI не “зависал” в вечном `loading`, в соответствии с `REQ-01..03`, `SC-01`, `SC-02`, `NEG-01`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | UI страницы видео + запуск транскрибации через `handleTranscribe()`; стейт `transcriptionStatus` (`idle/loading/success/error`) | Основной change-surface и источник edge-cases (pre-flight overwrite, reset на смену `id/provider`) | Переиспользовать существующую структуру UI, расширив coarse status до stage |
| `video_chat_and_translator/app/frontend/features/videos/transcription/client.ts` | `transcribeToVtt(...)`: preflight (`assertWithinProviderLimit`) → `fetch` → `.text()` → validate `WEBVTT` | Позволяет показывать “обработка у провайдера” как единый этап без инструментирования клиента | Сохранить контракт; callback/события — только при явной необходимости (см. `OQ-02`, `ER-02`) |
| `video_chat_and_translator/app/frontend/features/videos/transcription/providers.ts` | `assertWithinProviderLimit` бросает `TranscriptionError(code=file_too_large)` | Важно для корректного error stage и сообщений | Убедиться, что UI stage выставляется и на preflight-ошибках |
| `video_chat_and_translator/app/frontend/features/videos/transcription/errors.ts` | Типизированная ошибка `TranscriptionError` с `code` | UI должен отображать понятные ошибки и оставаться в управляемом состоянии | Маппинг `code` → текст и рекомендуемое действие |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | `setSubtitles(...)` сохраняет `.vtt` в IndexedDB и возвращает обновлённый `StoredVideoRecord` | Этап “сохранение результата” должен быть явно показан | Никаких изменений контракта; только UX stage вокруг await |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stage-модель + маппинг в UI | `REQ-01`, `REQ-02`, `REQ-03`, `SC-01`, `SC-02`, `NEG-01`, `CHK-01` | Есть только coarse `transcriptionStatus` | Vitest unit-тесты для helper-а (если выносим stage mapping из компонента) | `npm run test`, `npm run check` (в Docker/devcontainer) | GitHub Actions “App checks (Docker)” | none | none |
| UI evidence (mocked flow) | `CHK-01`, `EVID-01` | Нет | Playwright screenshots с замоканным `fetch` (success/error) для stage-переходов | (команда Playwright — см. `STEP-06` procedure) | “App checks (Docker)” (если добавим e2e) | Моки могут быть сложными в e2e | `AG-02` |
| UI evidence (real provider success) | `SC-01`, `SC-02` | Нет | none | none | none | Требует реального API key и внешней сети | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Нужен ли “процент” или достаточно этапов (stages)? | Issue просит “прогресс”, но не формализует | `STEP-02` | Default: stage-based (как в `REQ-02`). Если требуется % — эскалация владельцу и обновление `feature.md` |
| `OQ-02` | Нужен ли callback прогресса внутри `transcribeToVtt`? | `transcribeToVtt` монолитный await, но `REQ-02` требует 4 этапа | `STEP-02` | Default: **без правок `client.ts`** — этапы показываем в `Show.tsx` вокруг await-ов (подготовка → обработка → сохранение → готово). Callback — только после эскалации |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Devcontainer/Docker; агент не делает операций с сервером/процессами | весь план | Нельзя получить UI evidence без ручного запуска окружения владельцем |
| unit tests | `npm run test`, `npm run check` | `STEP-05` | Невалидная проверка перед PR |
| UI evidence | Скриншоты сохраняются в `artifacts/ft-018/verify/chk-01/` | `STEP-06`, `STEP-07` | Evidence не соответствует contract |
| access / secrets | Реальные API keys вводит человек в UI | `STEP-07` | Нельзя получить real success |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `CON-01` | Реализация остаётся client-side, без серверных изменений | `STEP-01..STEP-08` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-01`, `REQ-02` | Stage-модель + отображение этапов | agent | `PRE-01` |
| `WS-2` | `REQ-03`, `FM-01..03` | Error-state + recovery без вечного loading (включая pre-flight overwrite) | agent | `WS-1` |
| `WS-3` | `CHK-01`, `EVID-01` | Evidence: mocked flow (agent) + real success (human) | agent + human | `WS-1`, `WS-2`, `AG-01` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Любая проверка с реальным API key / внешним провайдером | `STEP-07` | Внешние запросы/ключи выполняет человек | project owner + `EVID-01` |
| `AG-02` | Если Playwright mocking `fetch` в e2e оказывается слишком сложным/нестабильным | `STEP-06` | В этом случае часть evidence станет manual-only | project owner + ссылка на решение |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-02` | Ввести stage-модель (`idle`/`preparing`/`processing`/`saving`/`success`/`error`/`validation_failed`) и UI отображение этапа; добавить reset stage в существующие reset-эффекты при смене `id` и `transcriptionProvider` | `Show.tsx` | Отображаемый stage + текст этапа | `CHK-01` | `EVID-01` | Визуальная проверка: stage виден сразу при клике; при смене provider/id stage сбрасывается в `idle` | `PRE-01` | none | Если stage не появляется мгновенно |
| `STEP-02` | agent | `REQ-02` | Переходы этапов вокруг существующих await: подготовка → (await `transcribeToVtt`) обработка → (await `setSubtitles`) сохранение → готово | `Show.tsx` | Обновлённый `handleTranscribe()` | `CHK-01` | `EVID-01` | Мок `fetch`/`transcribeToVtt` для фиксации стадий | `OQ-02` | none | Если требуется callback в `client.ts` |
| `STEP-03` | agent | `REQ-03` | Учесть pre-flight overwrite guard (сейчас `idle → error` без loading): выставлять `validation_failed` stage и понятный текст | `Show.tsx` | Корректный validation-failed UI | `CHK-01` | `EVID-01` | Смоделировать: subtitles уже есть + overwrite выключен | none | none | Если UX становится неоднозначным |
| `STEP-04` | agent | `REQ-03` | Recovery без отдельной кнопки “Retry”: повторный клик на основной кнопке запускает транскрибацию снова; при клике сбрасываем stage+error | `Show.tsx` | Recovery UX без дублирования UI | `CHK-01`, `SC-02` | `EVID-01` | Смоделировать: error → повторный клик → success (мок) | none | none | Если нужно отдельное действие “повторить” |
| `STEP-05` | agent | `FM-01..03` | Сообщения ошибок для `TranscriptionError.code` + гарантированный выход из loading при исключениях (в т.ч. preflight) | `Show.tsx` | Error messaging + safe state | `CHK-01` | `EVID-01` | Моки: `invalid_api_key`, `network`, `file_too_large`, `invalid_response` | none | none | Если ошибок слишком много для одной модели |
| `STEP-06` | agent | `CHK-01` | Evidence (mocked): снять Playwright screenshots для loading/stages/error/recovery без реального провайдера | Playwright + app | Скриншоты в `artifacts/ft-018/verify/chk-01/` | `CHK-01` | `EVID-01` | Playwright сценарий: перехватить `fetch` и вернуть canned `.vtt`/ошибку; сохранить скриншоты | none | none | Если mocking неустойчив |
| `STEP-07` | human | `SC-01`, `SC-02` | Evidence (real): запустить реальную транскрибацию с API key и снять скриншоты success + recovery | UI | Скриншоты | `CHK-01` | `EVID-01` | Ручной прогон в devcontainer | `AG-01` | `AG-01` | Если провайдер недоступен/CORS |
| `STEP-08` | agent | n/a | Simplify review: минимизировать сложность, убрать лишние UX элементы | touched files | Упрощённый код | `CHK-01` | `EVID-01` | Ручной review diff | none | none | Если stage-логика расползается |

## Parallelizable Work

- `PAR-01` `STEP-03` и `STEP-05` можно делать параллельно после появления stage-модели (`STEP-01`).
- `PAR-02` `STEP-06` только после `STEP-01..STEP-05`.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01..STEP-05` | Есть этапы + recovery + нет вечного loading | `EVID-01` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Невозможно надёжно воспроизвести “real success” без API key | Evidence неполное | Разделить evidence на mocked + manual real | Нет ключа |
| `ER-02` | Добавление callback в `transcribeToVtt` расширяет контракт и change surface | Может потребовать обновить `feature.md` (Scope/Contracts) | По умолчанию не трогаем `client.ts`; при решении менять — сначала обновить `feature.md` | Решили, что stages должны быть finer-grained |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `OQ-01` | Требуется процент прогресса | Остановиться и обновить `feature.md` (Scope/Verify) | Остаёмся на stage-based |
| `STOP-02` | `AG-02`, `STEP-06` | Mocking `fetch` в Playwright не получается детерминированно | Зафиксировать mocked-evidence как manual-only gap и снять скриншоты вручную | Evidence через ручной сценарий без e2e |

## Готово для приемки

Готово, когда `CHK-01` выполнен и `EVID-01` собран по контракту, а план принят на ревью:

- `EVID-REVIEW-02` Approved by project owner in chat (2026-04-17).

