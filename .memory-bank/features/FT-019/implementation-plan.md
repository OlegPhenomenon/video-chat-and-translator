---
title: "FT-019: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-019. Фиксирует discovery context, шаги, риски и test strategy без переопределения canonical feature-фактов."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_019_scope
  - ft_019_architecture
  - ft_019_acceptance_criteria
  - ft_019_blocker_state
---

# План имплементации

## Цель текущего плана

Реализовать client-side панель субтитров справа от видео для `FT-019` так, чтобы страница `VideosShow` могла читать сохранённый в IndexedDB `.vtt`, показывать сегменты списком, сворачивать/разворачивать панель и подсвечивать активный сегмент по `video.currentTime`, не меняя существующий контракт загрузки/хранения субтитров из `FT-016..018`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | Страница просмотра видео: загружает `StoredVideoRecord`, держит `videoRef`, управляет `<track>` и транскрибацией (`FT-017/018`) | Основной change surface для layout, чтения `subtitles` как `File`, toggle панели и подписки на `timeupdate` | Переиспользовать текущий `videoRef`, `hasSubtitles`, `subtitlesURL` и reset-паттерны локального состояния |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | IndexedDB storage для `StoredVideoRecord`, где `subtitles?: File` уже хранится и обновляется через `setSubtitles(...)` | `FT-019` обязан читать текущий client-side контракт без миграций и без новых полей | Использовать существующее поле `subtitles` как единственный источник VTT (`NS-04`, `CON-03`) |
| `video_chat_and_translator/spec/frontend/pages/videos/Show.test.tsx` | Page-level Vitest coverage для upload/toggle существующих субтитров | Локальный паттерн для тестирования `VideosShow` через mocks `findVideo`/`setSubtitles` и browser APIs | Расширить проверками empty/error/toggle состояния панели и DOM-маркера active segment там, где это детерминировано |
| `video_chat_and_translator/spec/frontend/features/videos/transcription/client.test.ts` | Pure frontend helper tests на `vitest` с моками браузерных API | Локальный reference для новых pure тестов `vtt.ts` и `active-segment.ts` | Отзеркалить стиль: table-like fixtures, deterministic inputs, без Rails/runtime зависимости |
| `video_chat_and_translator/package.json` | В репозитории есть `vitest`, `@testing-library/react`, `npm test`, `npm run check`; repo-local Playwright suite не настроен | План обязан опираться на реальный frontend test stack и явно отметить gap для UI evidence | Unit/component automation делаем через Vitest; Playwright evidence собирается отдельным verify-runner/skill по canonical contract |
| `.memory-bank/use-cases/README.md` | Реестр project-level `UC-*`; instantiated `UC-*` для video playback/transcript flow сейчас отсутствуют | Нужно явно зафиксировать, требуется ли `UC-*` update для closure этой фичи | Default stance: `FT-019` не вводит новый project-level use case; если sidebar transcript будет признан стабильным upstream flow, сначала создаётся/обновляется `UC-*`, потом closure |
| `.memory-bank/features/FT-019/feature.md` | Canonical scope, contracts (`CTR-01`, `CTR-02`), verify (`CHK-01..03`) и evidence contract | План не имеет права переопределять требования, а только sequencing | Ссылаться на `REQ-*`, `CTR-*`, `FM-*`, `CHK-*`, `EVID-*` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VTT parser (`vtt.ts`) и active segment helper (`active-segment.ts`) | `CTR-01`, `CTR-02`, `REQ-03`, `REQ-05`, `CHK-02` | Отдельного coverage нет | Новые Vitest unit tests на валидный/partial/invalid VTT, таймкод-форматы, NOTE/identifiers/settings, active-index boundaries | `docker compose -f docker/docker-compose.yml run --rm web npm test`; `docker compose -f docker/docker-compose.yml run --rm web npm run check` | GitHub Actions `App checks (Docker)` | none | none |
| `VideosShow` / `SubtitlesPanel` UI integration | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-05`, `CHK-01`, `CHK-03` | Есть только tests для upload/download/toggle нативного `<track>` | Расширить `Show.test.tsx` и/или добавить panel-level tests: render со списком, empty/error state, hide/show toggle, active marker при mocked `currentTime` | `docker compose -f docker/docker-compose.yml run --rm web npm test`; `docker compose -f docker/docker-compose.yml run --rm web npm run check` | GitHub Actions `App checks (Docker)` | none | none |
| Invalid VTT regression guard для нативного `<track>` | `REQ-05`, `FM-02`, `NEG-02`, `CHK-01`, `CHK-02` | Нет explicit coverage того, что наш parser/UI error state не удаляет существующий `<track>` | Добавить Vitest/page assertions: при parser `status: "invalid"` `<track>` остаётся смонтированным, `subtitlesURL` не теряется, toggle нативных subtitles остаётся рабочим; затем продублировать это как обязательную точку в Playwright evidence | `docker compose -f docker/docker-compose.yml run --rm web npm test`; `docker compose -f docker/docker-compose.yml run --rm web npm run check` | GitHub Actions `App checks (Docker)` | none | none |
| UI evidence via Playwright screenshots | `CHK-01`, `CHK-03`, `EVID-01`, `EVID-03` | Repo-local Playwright suite и CI job отсутствуют | Deterministic screenshot/assertion run через `playwright-cli` skill или другой verify-runner против локально поднятого Docker app | Локально: поднять стек `docker compose -f docker/docker-compose.yml up`, затем снять артефакты в `artifacts/ft-019/verify/chk-01/` и `artifacts/ft-019/verify/chk-03/` | CI automation для Playwright пока не обязательна; canonical evidence может быть вне repo-local test suite | UI evidence остаётся manual/skill-driven, потому что в репозитории сейчас нет first-class Playwright harness | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Какой breakpoint считать “десктопной” шириной для правой панели: `lg`, `xl` или иной? | `REQ-01` требует “справа на десктопе / вниз на узких экранах”, но не фиксирует exact breakpoint | `STEP-04` | Default: использовать Tailwind `lg` breakpoint как первый двухколоночный режим текущей страницы; если нужен иной threshold, правится до execution review без изменения scope |
| `OQ-02` | Нужны ли стабильные `data-*` hooks для Playwright/assertions активного сегмента? | `CHK-03` требует детерминированный DOM marker, а текущая страница не имеет test hooks | `STEP-03`, `STEP-05` | Default: добавить нейтральные `data-subtitles-segment-index` / `data-active` на элементы панели; если ревьюер против DOM hooks, эскалировать на review этого плана |
| `OQ-03` | Надо ли поднимать repo-local Playwright suite в рамках самой фичи или достаточно external verify-runner evidence? | Feature contract требует Playwright-артефакты, но текущий repo не содержит соответствующего harness | `STEP-07` | Default: не расширять test infrastructure в рамках `FT-019`; использовать `playwright-cli` skill и сохранить артефакты по evidence contract. Если manual gap сохранится к closure, открыть follow-up issue/ADR на repo-local Playwright harness до закрытия feature |
| `OQ-04` | Нужен ли `UC-*` update для sidebar transcript flow? | В use-case registry нет instantiated сценария для local video playback/transcript panel, а `feature-flow` требует обновить `UC-*`, если изменяется устойчивый сценарий проекта | whole plan | Default: считать изменение feature-local refinement страницы видео и не создавать `UC-*`; если на review/sidebar flow признаётся новым upstream продуктовым сценарием, сначала создать/update `UC-*`, затем продолжать closure |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Development and verify выполняются через Docker Compose по `.memory-bank/ops/development.md`; для UI evidence приложение должно быть поднято через `docker compose -f docker/docker-compose.yml up` | `STEP-06`, `STEP-07` | Страница недоступна локально или verify не повторяет project environment |
| unit / component tests | Эталонные frontend checks: `docker compose -f docker/docker-compose.yml run --rm web npm test` и `docker compose -f docker/docker-compose.yml run --rm web npm run check`; parity gate для PR — зелёный `bin/ci`/`App checks (Docker)` | `STEP-02`, `STEP-05`, `CHK-02` | Локальные тесты зелёные только на хосте или расходятся с Docker/CI |
| unit evidence | Логи Docker/Vitest/CI для `CHK-02` сохраняются в `artifacts/ft-019/verify/chk-02/` | `STEP-06` | Carrier `EVID-02` отсутствует или не соответствует `feature.md` contract |
| UI evidence | Скриншоты и assertion logs сохраняются строго в `artifacts/ft-019/verify/chk-01/` и `artifacts/ft-019/verify/chk-03/` | `STEP-07` | Evidence не соответствует `feature.md` contract или потеряна связь `CHK-*` → `EVID-*` |
| access / network / secrets | `FT-019` не требует внешних API или секретов для исполнения; все данные берутся из локального `StoredVideoRecord.subtitles` | `STEP-01`..`STEP-08` | Попытка решить задачу внешним запросом или серверным API меняет scope |
| git / branching | До `STEP-01` текущая ветка обязана быть отличной от `main`, а PR-first контур должен существовать и ссылаться на `feature.md` + `implementation-plan.md` | `STEP-00`, `STEP-01` | Работа продолжается в `main` или без PR-first linkage |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `NS-04`, `CON-03` | Источник субтитров остаётся прежним: `StoredVideoRecord.subtitles` содержит `File` с VTT, без смены storage contract | `STEP-01`..`STEP-08` | yes |
| `PRE-02` | `ASM-02`, `CTR-02`, `FM-03` | Страница `VideosShow` остаётся owner-ом `videoRef` и может подписываться на `timeupdate` без переноса плеера в другой слой | `STEP-03`..`STEP-08` | yes |
| `PRE-03` | `.memory-bank/flows/feature-flow.md` (PR-first) | До execution code changes создана feature branch, push и PR; planning snapshot в `main` не даёт права начинать execution из `main` | `STEP-00`..`STEP-08` | yes |
| `PRE-04` | `EVID-REVIEW-01` в sibling `feature.md` | Human review `feature.md` принят и зафиксирован как design-ready handoff | `STEP-00`..`STEP-08` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `CTR-01`, `CTR-02`, `REQ-03`, `REQ-05` | Новый feature-модуль `features/videos/subtitles/` с parser/helper/type contracts | agent | `PRE-01`, `PRE-02` |
| `WS-2` | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-05`, `FM-01`, `FM-02`, `FM-03` | `SubtitlesPanel` + интеграция в `VideosShow` с responsive layout, toggle и sync state | agent | `WS-1` |
| `WS-3` | `CHK-02` | Deterministic unit/component coverage для parser/helper/UI integration | agent | `WS-1`, `WS-2` |
| `WS-4` | `CHK-01`, `CHK-03`, `EVID-01`, `EVID-03` | Playwright artifacts для UI states и active segment sync | agent + human | `WS-2`, `AG-01` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | UI evidence по `CHK-01`/`CHK-03` остаётся manual/skill-driven, потому что в repo нет first-class Playwright harness | `STEP-07` | Plan gate требует явного approve manual-only gap для verify surface, который не закрыт repo-local automation | human approver; фиксируется в `EVID-REVIEW-PLAN-02` этого плана |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-00` | human | PR-first | Создать feature branch от `main`, запушить её и открыть PR с ссылками на `feature.md` и `implementation-plan.md` до начала execution | git / GitHub | PR URL + task linkage (`artifacts/ft-019/reviews/pr-created.md`) | — | — | Открыть PR и записать ссылку в `artifacts/ft-019/reviews/pr-created.md` после approve плана | `PRE-03` | none | Если execution вынужденно начинается в `main`, остановиться и зафиксировать deviation |
| `STEP-01` | agent | `CTR-01`, `REQ-05`, `FM-02` | В начале шага заморозить shared contracts `Segment` / `ParseError` / `ParseResult` в `features/videos/subtitles/index.ts`, затем реализовать `vtt.ts`: timestamp parsing, NOTE/cue identifiers/multi-line/settings handling, `ok/partial/invalid` result без throw | `app/frontend/features/videos/subtitles/vtt.ts`, `index.ts` | Pure parser contract + frozen shared types | `CHK-02` | `EVID-02` | Прогнать unit tests parser-а в Docker и сохранить лог в `artifacts/ft-019/verify/chk-02/` | `PRE-01` | none | Если реальный VTT требует расширить contract beyond `CTR-01` |
| `STEP-02` | agent | `CTR-02`, `REQ-03`, `FM-03` | Ввести `active-segment.ts` с pure выбором active index и покрыть границы (`start <= currentTime < end`, empty/out-of-range) после фиксации shared `Segment` contract в `STEP-01` | `app/frontend/features/videos/subtitles/active-segment.ts`, tests | Pure active-segment helper | `CHK-02` | `EVID-02` | Vitest на helper boundaries | `PRE-02`, `STEP-01` | none | Если подсветка требует scroll/visibility behavior из `NS-06` |
| `STEP-03` | agent | `REQ-01`, `REQ-02`, `REQ-04`, `REQ-05` | Создать `SubtitlesPanel.tsx` как presentational component: раскрыто/свернуто, список сегментов, empty/error state, active marker и стабильные DOM hooks для verify | `app/frontend/features/videos/subtitles/SubtitlesPanel.tsx`, `index.ts` | UI-компонент панели | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | Component/page tests с deterministic props | `STEP-01`, `STEP-02`, `OQ-02` | none | Если компонент начинает тянуть I/O или ownership `videoRef` |
| `STEP-04` | agent | `REQ-01`, `REQ-02`, `REQ-03`, `REQ-04`, `REQ-05` | Интегрировать panel feature в `VideosShow`: читать `record.subtitles` как текст, парсить с graceful recovery, вести `isPanelOpen`, `parseState`, `currentTime`, responsive layout на Tailwind `lg` и не ломать существующий `<track>` | `app/frontend/pages/videos/Show.tsx` | Обновлённая страница видео | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | Локально проверить render/toggle/sync на mocked record | `STEP-01`, `STEP-02`, `STEP-03`, `OQ-01` | none | Если layout change начинает затрагивать unrelated page flows |
| `STEP-05` | agent | `CHK-02`, `REQ-01`, `REQ-02`, `REQ-04`, `REQ-05`, `FM-02` | Добавить/обновить Vitest coverage: parser fixtures, active helper, page-level render/toggle/error/empty/sync marker tests и explicit regression guard, что при parser `status: "invalid"` существующий `<track>` остаётся смонтированным, `subtitlesURL` не теряется и native subtitles toggle не деградирует | `spec/frontend/features/videos/subtitles/*.test.ts`, `spec/frontend/pages/videos/Show.test.tsx` | Automated regression coverage | `CHK-02` | `EVID-02` | `docker compose -f docker/docker-compose.yml run --rm web npm test` и `... npm run check`; сохранить carrier в `artifacts/ft-019/verify/chk-02/` | `STEP-01`..`STEP-04` | none | Если existing page tests оказываются слишком связанными и требуют refactor test setup |
| `STEP-06` | agent | `CHK-02` | Пройти local Docker verify и подготовить evidence carrier для unit/component suite | Docker + test runner | Логи прогонов для parser/helper/UI tests в `artifacts/ft-019/verify/chk-02/` | `CHK-02` | `EVID-02` | Docker commands из Environment Contract + затем PR CI monitor | `STEP-05` | none | Если локальный Docker verify расходится с CI |
| `STEP-07` | agent + human | `CHK-01`, `CHK-03`, `REQ-05`, `FM-02` | Снять Playwright evidence: раскрытая панель, свёрнутая панель, empty state, error state, active segment = N и N+1 после смены `currentTime`; для invalid VTT явно зафиксировать, что `<track>` остаётся на месте и нативный toggle не ломается | local app + Playwright verify-runner | Скриншоты и assertion logs в `artifacts/ft-019/verify/chk-01/`, `artifacts/ft-019/verify/chk-03/` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | Поднять app в Docker, пройти сценарии через `playwright-cli` skill, проверить отсутствие console errors и наличие `<track>` в invalid-VTT state | `STEP-04`, `AG-01`, `OQ-03` | `AG-01` | Если без repo-local harness нельзя получить детерминированные артефакты |
| `STEP-08` | agent | simplify review | Проверить, что решение осталось минимальным: parser/helper чистые, UI ownership не размазан, panel feature не лезет в transcription module | touched files | Упрощённый и reviewable diff | — | — | Simplify review после functional pass и до final handoff; при необходимости зафиксировать заметки в `artifacts/ft-019/reviews/simplify-review.md` | `STEP-06` | none | Если implementation начинает тянуть общие abstractions без второй точки использования |

## Parallelizable Work

- `PAR-01` После того как в начале `STEP-01` заморожен shared contract `Segment` / `ParseResult`, оставшуюся parser-реализацию и `STEP-02` можно вести параллельно внутри `WS-1`.
- `PAR-02` `STEP-03` можно начать после фиксации `Segment`/`ParseResult` contract, не дожидаясь полной интеграции в `Show.tsx`.
- `PAR-03` `STEP-07` нельзя начинать до завершения `STEP-04` и локальной стабилизации из `STEP-06`, иначе evidence будет недостоверным.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-02`, `CHK-02` | Shared `Segment` / `ParseResult` contract зафиксирован, parser и active helper существуют как pure contracts и покрыты deterministic tests | `EVID-02` |
| `CP-02` | `STEP-03`, `STEP-04`, `STEP-05`, `CHK-01`, `CHK-02` | `VideosShow` рендерит panel/empty/error/toggle без регрессии существующего видео-плеера; при invalid VTT `<track>` остаётся смонтированным и native toggle не деградирует | `EVID-01`, `EVID-02` |
| `CP-03` | `STEP-06`, `STEP-07`, `CHK-03` | Active marker меняется по `currentTime`, local Docker verify зелёный, UI evidence сохранён по contract | `EVID-01`, `EVID-02`, `EVID-03` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Наивный parser не переварит реальные варианты VTT от провайдера (BOM, NOTE, cue settings, multi-line cues) | `REQ-05` сломается, страница может уйти в error state чаще ожидаемого | Сразу тестировать по полному `CTR-01` fixture набору и не бросать exceptions из parser-а | Первый fixture даёт `invalid`, хотя должен быть `ok`/`partial` |
| `ER-02` | Подписка на `timeupdate` или чтение `currentTime` создаст flaky sync state на первом рендере | `REQ-03` станет недетерминированным, `FM-03` не закрыт | Держать null-safe currentTime state, вычислять active index отдельно и не делать panel owner-ом video element | Active marker отсутствует после mount или скачет между сегментами |
| `ER-03` | Responsive layout для правой панели может непреднамеренно сломать существующую страницу на мобильной ширине | Регрессия основной video page | Делать layout change только локально в `Show.tsx`, проверять stacked mode и не менять unrelated blocks | Панель сжимает плеер или ломает controls на узкой ширине |
| `ER-04` | Отсутствие repo-local Playwright harness замедлит сбор evidence или сделает его manual-only | Plan Ready / Done gate может зависнуть на verify | Зафиксировать gap заранее (`AG-01`) и, если gap сохранится к closure, открыть follow-up issue/ADR на repo-local Playwright harness | Нельзя воспроизвести `CHK-01`/`CHK-03` детерминированно обычными тестами |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CTR-01`, `ER-01` | Для поддержки реального VTT требуется расширить parser contract beyond `CTR-01` (например, новые блоки/семантика, меняющие verify) | Остановить execution и сначала обновить sibling `feature.md` | Не писать ad-hoc parser поведение вне canonical contract |
| `STOP-02` | `NS-06`, `STEP-04` | Для `REQ-03` внезапно требуется автоскролл/visibility guarantee активного сегмента | Остановить rollout этой части и поднять follow-up scope decision | Оставить только DOM marker active segment без autoscroll |
| `STOP-03` | `AG-01`, `OQ-03`, `ER-04` | UI evidence нельзя собрать Playwright-ом без расширения test infrastructure | Зафиксировать блокер и запросить human decision: расширять infra или approve manual gap; если manual gap approve даётся, завести follow-up issue/ADR на repo-local Playwright harness до closure | Не подменять Playwright-contract случайными ручными скриншотами без approve |

## Готово для приемки

План считается исчерпанным, когда:

- завершены `CP-01`..`CP-03`;
- `EVID-01`, `EVID-02`, `EVID-03` собраны по путям из sibling `feature.md`;
- local Docker verify и PR CI green подтверждают change surface;
- для manual-only части `CHK-01`/`CHK-03` есть явный approve по `AG-01`;
- все canonical exit criteria `EC-01`, `EC-02`, `EC-03` закрыты через соответствующие `CP-*` / `CHK-*`;
- по `OQ-04` явно подтверждено, что `UC-*` update не нужен, либо соответствующий `UC-*` создан/обновлён до closure;
- этот план получил review evidence и может быть переведён из `status: draft` в `status: active`.

`EVID-REVIEW-PLAN-01`: Changes requested by reviewer in chat (2026-04-22). Persisted at `artifacts/ft-019/reviews/plan-review-01-changes-requested.md`.

`EVID-REVIEW-PLAN-02`: Approved by project owner in chat (2026-04-22). Persisted at `artifacts/ft-019/reviews/plan-approved.md`.
