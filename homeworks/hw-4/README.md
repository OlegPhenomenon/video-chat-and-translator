# HW-4 — Исполнение больших планов с состоянием

Тема недели: **верификация, состояние процесса, run-loop, verification-loop**.

Сдача состоит из двух связанных частей:

1. **Два малых цикла улучшения артефактов** — `brief improve loop` и `spec improve loop`.
2. **Один большой цикл** — проводит фичу через SDLC с сохраняемым состоянием (brief → spec → impl → check → smoke → verify → fix), с минимум одним stop/resume и финальным `done`/`blocked`/`escalation`.

## Структура каталога

```
homeworks/hw-4/
├── README.md                      ← вы здесь
├── brief-loop/
│   ├── process-spec.md            ← диаграмма, entry/exit, escalation, runner contract
│   └── prompt.md                  ← системный промпт для агента-улучшайки brief
├── spec-loop/
│   ├── process-spec.md
│   └── prompt.md                  ← промпт для улучшайки feature.md / implementation-plan
├── big-loop/
│   ├── process-spec.md            ← 8 этапов SDLC + state save + HITL
│   └── prompt.md                  ← стартовый промпт исполнителя большого цикла
├── scripts/
│   ├── run-loop.sh                ← универсальный runner для малых циклов
│   └── run-feature.sh             ← оркестратор большого цикла
├── state-pack/
│   └── <feature-id>/              ← active-context.md / plan.md / session-handoff.md
└── runs/
    └── <feature-id>-<date>/       ← trace.md + report.md по реальному прогону
```

## Связь с предыдущими неделями

- **HW-2 (Memory Bank).** Шаблоны `feature.md` / `implementation-plan.md` в `.memory-bank/features/` — это то, что улучшают малые циклы.
- **HW-3 (Eval + Orchestration).** Промпты-ревьюеры из `eval/prompts/{feature_reviewer,feature_implement_plan_reviewer,brief_creation}.md` и тесты Promptfoo в `eval/promptfooconfig.*.yaml` дают **критерии качества** артефактов. HW-4 надстраивает над ними цикл («проверь → если не APPROVE → попроси автора дописать → перепроверь → exit»).
- **`scripts/start-task.sh` (HW-3).** Большой цикл переиспользует его как entry point — worktree + zellij + routing уже работают. HW-4 добавляет фазы verify/state и orchestration сверху.

## Что переиспользуется vs что новое

| Компонент | Откуда | Роль в HW-4 |
|---|---|---|
| `eval/prompts/feature_reviewer.md` | HW-3 | базовый критерий APPROVE для brief-loop |
| `eval/prompts/feature_implement_plan_reviewer.md` | HW-3 | базовый критерий APPROVE для spec-loop |
| `eval/prompts/brief_creation.md` | HW-3 | референс структуры brief, на которую ориентируется loop |
| `scripts/start-task.sh` + `scripts/init.sh` | HW-3 | worktree + zellij + routing для большого цикла |
| `homeworks/hw-4/{brief,spec,big}-loop/process-spec.md` | новое | формальное описание процесса (entry/exit, escalation, runner contract) |
| `homeworks/hw-4/scripts/run-loop.sh` | новое | универсальный runner малых циклов |
| `homeworks/hw-4/scripts/run-feature.sh` | новое | оркестратор большого цикла |
| `state-pack/<id>/` | новое | состояние длинного прогона между сессиями |

## Уровни качества (целевые для этой сдачи)

- **Базовый.** Описаны 2 малых цикла, есть runner, собран 1 большой цикл, state-pack из 2-3 артефактов, ≥1 stop/resume, trace + report.
- **Продвинутый.** Большой цикл реально переиспользует малые runner'ы, verification — реальные проверки (Vitest/RuboCop/CI), state обновляется по ходу нескольких этапов, отчёт показывает решение `done`/`blocked`/`escalation`.
- **Отличный.** Большой цикл доводит задачу через безопасный deploy/stage-контур, есть явный HITL/escalation-момент, runner переиспользуем (не привязан к одной задаче).

## Ссылки

- [Задание HW-4 (курс AI SWE)](https://docs.google.com/document/d/1JibOHaemJ5PwROfj77O-wyPBTtkvdzRjDTCzXE4Xgak/edit?usp=sharing)
- [HW-3 report](../hw-3/report.md) — оркестрация и eval, на которые опирается HW-4
- [orchestration routing](../../docs/orchestration/routing.md)
