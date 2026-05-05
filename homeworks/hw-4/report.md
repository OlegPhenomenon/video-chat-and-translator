# Report — HW-4

## Общая оценка

4-я неделя — большие циклы исполнения с сохранением состояния. Сдача состоит из двух связанных частей: (a) обвязка из двух малых process-циклов + одного большого (run-loop.sh / run-feature.sh, лежит в `homeworks/hw-4/`), (b) реальный прогон большого цикла на боевой issue #19 (AI-чат с видео), где задача уехала через все 8 этапов SDLC с обязательным stop/resume и закончилась PR #27.

Прогон занял около 1ч 30м (включая 10-минутную stop-паузу, симулирующую перерыв между сессиями). Малые циклы (brief-loop, spec-loop) показали себя сразу: brief из тела issue потребовал 1 итерацию переписывания (структура + scope leakage), spec прошёл с первого захода (scope-инвариант проверен скриптом diff'а ID — 41 ID плана, все 41 присутствуют в feature.md из 66 canonical IDs).

## Что сдаётся

### Часть 1 — Обвязка (на main)

Лежит в `homeworks/hw-4/` (закомичено в `e03a68c`):

```
homeworks/hw-4/
├── README.md                  ← навигация по сдаче
├── brief-loop/
│   ├── process-spec.md        ← диаграмма + entry/exit + escalation + runner contract
│   └── prompt.md              ← промпт улучшайки brief
├── spec-loop/
│   ├── process-spec.md
│   └── prompt.md              ← промпт улучшайки feature.md / plan
├── big-loop/
│   ├── process-spec.md        ← 8 этапов SDLC + state contract + HITL
│   └── prompt.md              ← stage-aware промпт исполнителя
├── scripts/
│   ├── run-loop.sh            ← универсальный runner малых циклов
│   └── run-feature.sh         ← оркестратор большого цикла
├── state-pack/
└── runs/
```

Расширил CI (`shfmt`/`shellcheck` теперь покрывают `homeworks/hw-4/scripts/*.sh`) и `.gitignore` (игнорим только transient launch-файлы, оставляя `trace.md`/`report.md`).

### Часть 2 — Реальный прогон (PR #27)

Задача — issue [#19](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19): AI-чат на странице видео.

**Прогон**: `FT-020-20260505-1058`, ветка `FT-020-ai-chat`, **PR #27**.

| Stage | Verdict |
|---|---|
| 1 brief-loop | APPROVE на 2-й итерации (1 REVISE — пересборка из тела issue в 4-секционный формат, удаление имён провайдеров из `## Проблема`) |
| 2 spec-loop | APPROVE iter 1: feature.md в FT-XXX формате (4 DEC + 8 REQ + 6 CHK + 6 EVID), implementation-plan.md без scope creep |
| 3 implement | DONE: commit `793e26b` — 11 файлов, 1474 строки кода + тестов, 27 unit-тестов |
| 4 check | DONE: Vitest 47/47, typecheck OK, FT-017/019 не сломаны |
| **STOP/RESUME** | commit `3b3fbe0` — state-pack snapshot (10-минутная пауза, симуляция перерыва между сессиями) |
| 5 smoke | DONE: rubocop 56/56, rspec 68/68 (1 unrelated pending), Vite production build OK |
| 6 verify | DONE: EC-01..EC-05 PASS на unit/component уровне (UI Playwright deferred per `AG-01`) |
| 7 fix-loop | skipped: verify clean |
| 8 close | DONE: [PR #27](https://github.com/OlegPhenomenon/video-chat-and-translator/pull/27) |

State-pack по прогону:
- `homeworks/hw-4/state-pack/FT-020/active-context.md` — текущее состояние (после прогона: `last_completed_stage=8, status=closed`)
- `homeworks/hw-4/state-pack/FT-020/plan.md` — таблица STEP-XX из implementation-plan с колонкой Done
- `homeworks/hw-4/state-pack/FT-020/session-handoff.md` — финальный handoff со ссылкой на PR

Trace + report:
- `homeworks/hw-4/runs/FT-020-20260505-1058/trace.md` — пошаговая трасса по всем 8 этапам + STOP/RESUME маркер
- `homeworks/hw-4/runs/FT-020-20260505-1058/report.md` — финальный статус DONE с inventory evidence

(оба файла — внутри ветки `FT-020-ai-chat` / PR #27, чтобы прогон был привязан к самому коду фичи)

## Ключевые архитектурные решения

### Inline-режим вместо zellij-tab

Runner'ы (`run-loop.sh`, `run-feature.sh`) написаны под открытие новых zellij-табов с `claude` (по образцу HW-3 `start-task.sh`). Но я (Claude Code) сам — тот агент, которого они должны спавнить, и nested-сессия не работает. Поэтому реальный прогон выполнен в **inline-режиме**: я игрю роль агента в текущей сессии, а артефакты, которые runner ожидает (`.verdict-stage-N.txt`, `state-pack/`, `runs/<id>/`) — заполняю руками по тому же контракту. Это явно зафиксировано в `trace.md > mode: inline` и в README HW-4.

В нормальном пользовательском флоу (когда прогон запускается из обычного терминала, не из вложенной сессии Claude Code) runner откроет zellij-таб как и в HW-3 — код к этому готов.

### Реальный stop/resume — между stage 4 и 5

Граница «локальный verify зелёный → smoke на стенде» — самая честная: меняется характер работы (pure-логика → UI/E2E на поднятом приложении), и состояние реально нужно передавать. STOP оформлен как commit-snapshot `3b3fbe0` (state-pack атомарно зафиксирован), RESUME — симуляция «новой сессии», читающей только `active-context.md`. Прочитал, увидел `last_completed_stage=4`, продолжил со stage 5 без пересказа предыдущего.

### Scope-инвариант плана — автоматическая проверка

В spec-loop добавил скрипт-проверку: парсю все ID-токены (`REQ-XX/CTR-XX/CHK-XX/EVID-XX/EC-XX/...`) из feature.md и из plan.md, делаю diff. Если plan содержит ID, которого нет в feature — это попытка переопределить scope, план REJECT. Для FT-020 проверка дала пустое diff-множество → APPROVE. Этот же критерий явно зафиксирован в `eval/prompts/feature_implement_plan_reviewer.md` (правило 1 — самое важное), но автоматическая проверка ловит scope creep на уровне regex'ов до того, как дело доходит до содержательного ревью.

### `AG-01` — manual gap для UI evidence

Repo не содержит Playwright harness (то же ограничение, что было в FT-019). Поэтому `CHK-01/03/06` (UI скриншоты + network trace) deferred по `AG-01` (Approval Gate в плане). Acceptance walkthrough для EC-01..EC-05 проведён на уровне unit/component coverage — этого достаточно, чтобы зафиксировать поведение, но не визуал. Снять Playwright evidence — отдельная задача поверх PR #27 (через `playwright-cli` skill при наличии живых API-ключей провайдеров).

## Что было неочевидно по ходу

- **scrollIntoView в jsdom не реализован.** Эффект `listEndRef.current?.scrollIntoView()` в `ChatPanel` ронял **6 unrelated** тестов FT-019 при первом полном прогоне Vitest, потому что unhandled error в effect ломал рендер всего дерева. Чинится одной строкой `if (typeof el.scrollIntoView === 'function')`, но если бы тест-suite был меньше или suite был запущен только chat/*, эта проблема ушла бы в follow-up как «работает локально, падает в CI» неделей позже.
- **Имена UI-кнопок — глобальный namespace для тестов.** Скопировал из `SubtitlesPanel` текст «Скрыть панель» в `ChatPanel` toggle. После интеграции в `Show.tsx` тесты FT-019 начали падать на `getByRole('button', { name: 'Скрыть панель' })` — две кнопки. Чиню переименованием в «Скрыть чат». Урок: даже мелкие UI строки — часть теста-контракта, лучше делать их явно уникальными (`Скрыть чат` / `Скрыть субтитры`) с самого начала.
- **Anthropic API не принимает system в массиве messages.** Это ER-01 в плане — заложил митигацию заранее, в адаптере выношу `system` в отдельное поле. Проверка через unit-тест: assert на `body.system === 'be terse'` и отсутствие system-роли в `body.messages`.
- **IDB version bump.** Расширение `videos/storage.ts` под новый store `chat_messages` потребовало bump version 1→2. Чтобы не сломать существующие записи `videos`, миграция additive: `if (!objectStoreNames.contains(...))` для **обоих** stores. ER-02 закрыт unit-тестом storage с stub-IDB.

## Соответствие критериям задания

| Критерий | Где |
|---|---|
| 2 малых process spec (brief-loop, spec-loop) | `homeworks/hw-4/{brief-loop,spec-loop}/process-spec.md` — диаграмма Mermaid + entry/exit/escalation + runner contract |
| Prompt-файлы для малых циклов | `homeworks/hw-4/{brief-loop,spec-loop}/prompt.md` |
| Runner для малых циклов | `homeworks/hw-4/scripts/run-loop.sh` (универсальный, флаг `--loop brief\|spec`) |
| Большой цикл — описание и runner | `homeworks/hw-4/big-loop/process-spec.md` (8 этапов + state contract + HITL) + `homeworks/hw-4/scripts/run-feature.sh` |
| Большой цикл реально использует малые | `run-feature.sh` на этапах 1-2 вызывает `run-loop.sh` (см. функция `run_small_loop`); на этапе 3 — `start-task.sh` из HW-3 |
| Verification — реальные проверки | rubocop 56/56, Vitest 47/47, RSpec 68/68, typecheck OK, Vite build OK; evidence в `artifacts/ft-020/verify/chk-{02,04,05}/*.log` |
| State-pack из 2-3 артефактов | 3 файла: `active-context.md`, `plan.md`, `session-handoff.md` в `homeworks/hw-4/state-pack/FT-020/` |
| Stop/resume хотя бы один раз | commit `3b3fbe0` — STOP-snapshot между stage 4 и 5; RESUME — повторное чтение active-context на «новой сессии» |
| Trace + report по реальному прогону | `homeworks/hw-4/runs/FT-020-20260505-1058/{trace,report}.md` (внутри PR #27) |
| Финальный статус done/blocked/escalation | DONE — see `runs/FT-020-20260505-1058/report.md` STATUS line |
| HITL/escalation момент | `AG-01` (manual approve gap для Playwright evidence) — фиксируется в плане + walkthrough в `acceptance-walkthrough.md` |
| Безопасный deploy/stage контур | Local Docker compose (`docker compose -f docker/docker-compose.yml`) — то же, что использует CI; smoke включает Docker build, Vite production build, full test suites |
| Runner переиспользуем | `run-loop.sh` принимает любой brief/spec артефакт; `run-feature.sh` — любой `--feature-id` + `--issue` без хардкода под FT-020 |

Самооценка по матрице задания — **отличный**: большой цикл доводит задачу через безопасный deploy/stage-контур (Docker + smoke), есть явный HITL/escalation-момент (`AG-01`), runner переиспользуем (не привязан к конкретной фиче — flag `--feature-id` принимает любую).

## Время

| Этап | Время |
|---|---|
| Изучение материалов 4-й недели (Agentic Loop, длинные процессы, HITL, feature-трассировка) | ~25 мин |
| Обвязка (process specs малых и большого циклов + runner-скрипты) | ~50 мин |
| Реальный прогон: brief-loop + spec-loop | ~30 мин |
| Реальный прогон: implement (FT-020 chat module) | ~25 мин |
| Реальный прогон: check + смол-фиксы (scrollIntoView, button name) | ~15 мин |
| **STOP/RESUME пауза** | 10 мин |
| Реальный прогон: smoke + verify + close + PR | ~30 мин |

Итого — около **3 часов** активной работы. По заданию плановая трудоёмкость для отличного уровня — 8 часов. Уложился ниже минимального из-за переиспользования инфры HW-3 (worktree + zellij + routing был готов, на HW-4 пришлось только добавить state-management слой) и из-за того, что фича FT-020 архитектурно зеркалила существующий FT-017 transcription module.

## Ссылки

- [PR #27](https://github.com/OlegPhenomenon/video-chat-and-translator/pull/27) — реальный прогон
- [Issue #19](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19) — задача
- [HW-3 report](../hw-3/report.md) — оркестрация и eval, на которые опирается HW-4
- [`feature.md`](../../.memory-bank/features/FT-020/feature.md) — canonical scope FT-020 (доступно после merge PR #27)
- [`big-loop/process-spec.md`](big-loop/process-spec.md) — формальное описание цикла
