---
title: "FT-016: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-016. Фиксирует discovery context, шаги, риски и test strategy без переопределения canonical feature-фактов."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_016_scope
  - ft_016_architecture
  - ft_016_acceptance_criteria
  - ft_016_blocker_state
---

# План имплементации

## Цель текущего плана

Реализовать client-side субтитры (`.vtt`) для локально сохранённых видео: upload → сохранение в IndexedDB рядом с видео → download → toggle отображения на странице просмотра, согласно `REQ-01..03`, `CON-01..02`, `SC-01..02`, `NEG-01..02`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | IndexedDB-хранилище для видео (`StoredVideoRecord` содержит `file: File`) | Нужно расширить запись под `subtitles?: File` и добавить update-операции | Повторить `openDB()`/`normalizeError()` и паттерн транзакций `readwrite` |
| `video_chat_and_translator/app/frontend/pages/videos/Index.tsx` | Upload видео в IndexedDB + UX-паттерн ошибок | Нужен паттерн валидации файла и показ ошибки рядом с input | Повторить UX: строка ошибки, сброс `e.target.value = ''` |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | Рендер `<video src={objectURL} controls />` по данным из IndexedDB | Здесь добавляется `<track>` и toggle субтитров + upload/download UI | Повторить паттерн `useEffect` + отмена + `URL.revokeObjectURL` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Storage: subtitles persistence in IndexedDB | `REQ-01`, `REQ-02`, `NEG-01` | Есть Vitest baseline в проекте (см. `spec/frontend/pages/auth/Register.test.tsx`) | Vitest unit-тесты для `videos/storage.ts`: `setSubtitles/clearSubtitles` + read-back через `findVideo` | `npm test` (vitest run) | `bin/ci` step `Test: Frontend` (runs `npm test`) | Manual остаётся только для реального `<video>/<track>` поведения | `none` |
| UI: Show page behavior (toggle + validation UX) | `REQ-03`, `SC-01`, `NEG-01`, `NEG-02` | Нет coverage на videos page | Vitest + Testing Library: рендер `Show.tsx` с mock `findVideo`, проверка отображения ошибки при не-`.vtt` и наличия toggle/download при наличии subtitles | `npm test` | `bin/ci` step `Test: Frontend` | Browser-specific playback/subtitles rendering (manual по `CHK-01`) | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Какой test harness используется для frontend (Vitest? Playwright? none?) | Resolved: в `package.json` есть `vitest` и `npm test` = `vitest run`; есть пример в `spec/frontend/.../*.test.tsx`; `bin/ci` запускает `npm test` | none | Использовать существующий Vitest + Testing Library; новые фреймворки не добавлять |
| `OQ-02` | Какую MIME/type-валидацию использовать для `.vtt`: по `file.name.endsWith('.vtt')` или `file.type` | В браузерах `file.type` для `.vtt` часто пустой/разный | `STEP-02` | По умолчанию валидировать по расширению `.vtt` (case-insensitive) + сообщение об ошибке |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Devcontainers: нельзя полагаться на server-side persistence видео/файлов | все шаги | Попытки реализовать Rails endpoints/attachments приводят к ложному дизайну |
| test | Frontend unit/component tests: Vitest (`npm test` = `vitest run`), примеры под `spec/frontend/**/*.test.tsx`; CI запускает `npm test` через `bin/ci` | `STEP-06` | Изменения без тестов не проходят coverage expectations; CI падает на `Test: Frontend` |
| test | Manual verify по `CHK-01..03` из `feature.md` выполняется в браузере | `STEP-07` | Невозможно подтвердить реальное поведение субтитров в `<video>` без UI-прохождения |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01` | Подтверждено: видео и файлы хранятся только client-side | `STEP-01..07` | yes |
| `PRE-02` | `CON-01`, `CON-02` | Решение: поддерживаем `.vtt`, отказ для других форматов с UX-паттерном ошибок | `STEP-02..05` | yes |
| `PRE-03` | `NS-04` | Toggle не persist-ится: при открытии страницы субтитры OFF | `STEP-05` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-01`, `REQ-02`, `CTR-01`, `CTR-02` | Storage API для чтения/записи subtitles по `videoId` | agent | `PRE-01`, `OQ-02` |
| `WS-2` | `REQ-03`, `SC-01`, `NEG-01`, `NEG-02` | UI на `Show.tsx`: upload/download/toggle + `<track>` | agent | `WS-1` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Появилась необходимость добавить новую тестовую зависимость/раннер сверх существующего Vitest baseline | `STEP-06` | Это меняет baseline tooling проекта | human / PR review |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-02` | Расширить `StoredVideoRecord` полем `subtitles?: File` и подготовить операции обновления записи | `.../features/videos/storage.ts` | Type update + новые функции `setSubtitles(videoId, file)` / `clearSubtitles(videoId)` | `CHK-01` (частично) | `EVID-01` | Компиляция frontend; smoke-read в коде | `PRE-01` | none | Если IndexedDB-операции требуют schema version bump (DB_VERSION) |
| `STEP-02` | agent | `CON-01`, `CON-02`, `NEG-01`, `CTR-01` | Определить валидацию `.vtt` и UX-ошибку рядом с input в `Show.tsx` | `.../pages/videos/Show.tsx` | UI error state + input accept `.vtt` | `CHK-03` | `EVID-03` | Manual: попытаться выбрать не-`.vtt` и увидеть отказ | `PRE-02`, `OQ-02` | none | Если `file.type`/extension проверки конфликтуют с реальными браузерами |
| `STEP-03` | agent | `REQ-01`, `CTR-01` | Реализовать upload `.vtt` в storage через `setSubtitles` и обновление UI состояния | `Show.tsx`, `storage.ts` | Persistence subtitles в IndexedDB | `CHK-01` | `EVID-01` | Manual: загрузить `.vtt`, перезайти на страницу видео и увидеть доступные действия | `STEP-01`, `STEP-02` | none | Если `File` нельзя сохранить/прочитать из IndexedDB в текущем браузере |
| `STEP-04` | agent | `REQ-02`, `CTR-02` | Реализовать download subtitles через создание object URL и “клик” на `<a download>` | `Show.tsx`, `storage.ts` | Download button + handler | `CHK-02` | `EVID-02` | Manual: скачать файл и сравнить имя/тип | `STEP-03` | none | Если браузер блокирует download из blob URL |
| `STEP-05` | agent | `REQ-03`, `NS-04` | Добавить `<track>` к `<video>` и toggle управления `TextTrack.mode` (default OFF) | `Show.tsx` | `<track>` + toggle UI | `CHK-01` | `EVID-01` | Manual: включить/выключить и убедиться, что при reload default OFF | `STEP-03` | none | Если `textTracks` недоступны до metadata loaded — потребуется подписка на события |
| `STEP-06` | agent | `REQ-01`, `REQ-02`, `REQ-03`, `NEG-01`, `NEG-02` | Добавить Vitest tests под `spec/frontend/` для storage и Show page UX | `video_chat_and_translator/spec/frontend/features/videos/`, `video_chat_and_translator/spec/frontend/pages/videos/` | Новые `*.test.ts(x)` | `CHK-01..03` (частично, где применимо unit/UI) | `EVID-01..03` | Запуск: `npm test` | none | `AG-01` (если новые deps) | Если тесты требуют новых deps или не удаётся смокать DOM APIs (`URL.createObjectURL`, `indexedDB`) |
| `STEP-07` | human | `CHK-01..03` | Выполнить ручные проверки и собрать evidence в `artifacts/ft-016/verify/...` | browser | Screenshots / downloaded files | `CHK-01..03` | `EVID-01..03` | Следовать процедурам из `feature.md` | после `STEP-01..05` | none | Если UI не воспроизводится в devcontainer окружении |

## Parallelizable Work

- `PAR-01` `STEP-01` (storage) можно делать параллельно с подготовкой UI-каркаса ошибок в `Show.tsx` (часть `STEP-02`), но интеграцию upload/download лучше после готовности storage API.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-03`, `CHK-01` | `.vtt` загружается и после reload страницы остаётся привязанным к `videoId` (subtitles persistence в IndexedDB) | `EVID-01` |
| `CP-02` | `STEP-04`, `CHK-02` | Download возвращает корректный `.vtt` | `EVID-02` |
| `CP-03` | `STEP-05`, `CHK-01`, `NS-04` | Toggle работает, default OFF после открытия страницы | `EVID-01` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | IndexedDB schema/versioning: добавление поля может потребовать bump `DB_VERSION` | Потеря данных/несовместимость старых записей | Делать change backward-compatible: `subtitles?` optional, без изменения store schema | Ошибки чтения/записи после деплоя |
| `ER-02` | Браузерные особенности `.vtt` MIME/type и `textTracks` | Непредсказуемая валидация/отображение | Валидировать по расширению; toggle через `track.mode` после `loadedmetadata` при необходимости | `file.type` пустой; `video.textTracks` пуст до load |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `AG-01` | Для тестов требуется новая зависимость/раннер сверх Vitest baseline | Остановиться и запросить approval | Оставить coverage в пределах текущих зависимостей; manual только там, где браузер-специфично |
| `STOP-02` | `ASM-01` | Попытка “прикрутить” server-side storage/ActiveStorage | Немедленно прекратить и вернуть дизайн в client-side | Frontend-only change surface |

## Готово для приемки

План считается исчерпанным, когда реализованы `STEP-01..05`, и собраны evidence по `CHK-01..03` (папки `artifacts/ft-016/verify/chk-01..03/`) согласно `EVID-01..03`, после чего можно закрывать `EC-01..02` в `feature.md`.

## Evidence

- `EVID-REVIEW-PLAN-01` Ревью `implementation-plan.md` (Changes Requested, Plan Ready gate) (репо-артефакт): `artifacts/ft-016/reviews/review-plan-01-changes-requested.md`.

