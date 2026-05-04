# Report — HW-3

## Общая оценка

3-я неделя — две крупные части: **Promptfoo eval** (закрыта раньше, артефакты в `eval/`) и **orchestration** (эта сдача). Часть 2 заняла около 2,5 часов вместе с осмыслением: zellij и git worktree до этого использовал поверхностно, на курсе разобрался основательно. Что важно — после сборки инфры один реальный bugfix из issue tracker'а уехал в PR ровно одной командой, без ручных переключений веток и контейнерных конфликтов.

## Часть 1 — Promptfoo eval

Сделана раньше, артефакты на диске:

- `eval/promptfooconfig.yaml` + `eval/promptfooconfig.{feature-reviewer,plan-reviewer}.yaml` — три набора кейсов
- `eval/baseline-results.json` / `after-fix-results.json` + соответствующие `.log` — до/после tuning
- `eval/feature-reviewer-{baseline,final}.json` и `plan-reviewer-{results,final,final2}.json` — раунды итераций
- `eval/findings.md` — заметки по проблемам и тюнингу

Подключено к локальному CI (`scripts/test-ci.sh`).

## Часть 2 — Orchestration

Цель: одна команда → новый изолированный worktree → новый таб zellij → claude/codex с готовым prompt'ом, выбранный по типу задачи.

### Артефакты в репо

- `scripts/init.sh` — инициализация нового worktree: `mise install`, перенос `.env*`/`.envrc` из main, `direnv allow`. Стартовый шаблон с курса, адаптирован под Rails-стек.
- `scripts/start-task.sh` — оркестрационный entrypoint. Принимает `<branch> --type --issue --base --agent --session`, делает `git worktree add`, запускает init, открывает таб в zellij с готовым launch-скриптом и prompt-файлом, прозрачно фолбэкает codex → claude. Работает и изнутри zellij, и снаружи (через `--session <name>` или авто-детект).
- `docs/orchestration/routing.md` — таблица routing: 9 типов задач (`spec | feature | frontend | bugfix | test | review | docs | refactor | freeform`), маппинг на агента + sub-agent/skill. Каждая запись меняет минимум одно измерение запуска (агент или подсказка), декоративных строк нет.
- `docs/orchestration/demo-runs/issue-24.md` — полный отчёт о реальном демо-прогоне.
- `.gitignore` — игнорит `.worktrees/` + launch-артефакты.

### Демо-прогон

Реальный issue из репозитория: [#24 — Исправить ошибку неверного ключа](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24).

Команда:

```bash
scripts/start-task.sh fix-24-transcription-error-text \
  --type bugfix \
  --issue https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24 \
  --session testword1
```

Что произошло за одну команду:

1. создался worktree `.worktrees/fix-24-transcription-error-text` от main;
2. отработал init (mise, env, direnv);
3. в активной zellij-сессии `testword1` открылся таб с этим именем;
4. в табе стартанул claude с prompt'ом, в котором ссылка на issue + routing-hint про rails-architecture-analyst;
5. claude автономно прочитал issue через `gh issue view`, прошёлся grep'ом по транскрибации, сделал минимальный фикс (`client.ts:24-32` + тест в `client.test.ts`), прогнал тесты через Docker, закоммитил, ребейзнул на main, запушил;
6. открыл PR.

**Результат:** [PR #26](https://github.com/OlegPhenomenon/video-chat-and-translator/pull/26) — `fix(transcription): surface invalid API key in network-error path`.

Полный stdout, дамп таба и git-состояние — в `docs/orchestration/demo-runs/issue-24.md`.

### Что было неочевидно по ходу

- Первая версия `start-task.sh` использовала `mktemp` + `trap 'rm $launch_script' EXIT` для очистки. Не учёл, что `zellij action new-tab` спавнит дочернюю сессию **асинхронно** — мой shell успевает выйти и удалить файл до того, как bash в новом табе его прочитает. Симптом: таб открывается, на месте claude — голый shell. Починено в `0117d33`: prompt-файл и launch-script лежат внутри самого worktree, переживают спавн, плюс удобны для post-mortem.
- Изначально предполагал, что оркестрирующий процесс всегда внутри zellij (по `$ZELLIJ`). Но мой harness Claude Code не в zellij — пришлось добавить `--session <name>` и авто-детект через `zellij list-sessions`. Это и архитектурно правильнее: оркестратор может быть внешним (CI, другой агент).
- Routing мог скатиться в декорацию. Чтобы этого избежать — каждая запись в таблице меняет либо binary (claude/codex), либо подсказку про конкретный sub-agent/skill из плагинов в `~/.claude`. Подсказка попадает в prompt, агент в новом табе её видит и реально дёргает.

### Соответствие критериям задания

| Критерий | Где |
|---|---|
| Мультиплексор | zellij 0.44.0, управление как изнутри, так и через `--session` |
| Изоляция через git worktree | `.worktrees/<branch>/` |
| Шаг инициализации | `scripts/init.sh` |
| Routing-правило | `docs/orchestration/routing.md` + код в `start-task.sh` |
| Один реальный запуск | issue #24 → ветка → коммит → PR #26 |
| Проверяемый результат | PR #26, дамп таба, git worktree state |

### Оценка собственная

Уровень — **отличный** по матрице задания: orchestration переиспользуем (можно прогнать любой следующий issue той же командой), eval-слой ловит регрессии, есть сравнение до/после tuning в Part 1, описаны ограничения выбранного flow.

## Время

| Этап | Время |
|---|---|
| Изучение материалов курса (eval landscape, orchestration patterns, multiplexer workflows, routing) | ~40 мин |
| Часть 1 (Promptfoo, baseline + tuning + reviewers) | сделано в предыдущую неделю, ~5 ч |
| Часть 2: разбор zellij/worktree/mise/direnv с курсовых материалов | ~30 мин |
| Часть 2: `init.sh`, `start-task.sh`, `routing.md` (с фиксом launch race) | ~1,5 ч |
| Часть 2: демо-прогон issue #24 + отчёт | ~30 мин |

Итого по части 2 — около **2,5 часов**. По заданию плановая трудоёмкость 4/6/8 ч (базовый/продвинутый/отличный). Уложился ниже базового времени за счёт того, что курс предложил готовый шаблон `init.sh` + `.envrc` с port-selector, и я его адаптировал, а не писал с нуля.
