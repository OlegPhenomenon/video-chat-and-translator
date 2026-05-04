# Demo run — Issue #24 (HW-3 Часть 2)

Реальный прогон orchestration-инфраструктуры. Одна команда `scripts/start-task.sh` создаёт изолированный worktree, инициализирует его, открывает новый zellij-таб в существующей сессии (даже если оркестратор находится снаружи zellij) и стартует claude с готовым prompt'ом по issue.

## Задача

- Issue: [#24 — Исправить ошибку неверного ключа](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24)
- Симптом: при невалидном API-ключе транскрибации UI показывает общее сообщение «Не удалось выполнить запрос к провайдеру. Возможны проблемы сети или CORS», вместо реальной причины (401/неверный ключ).
- Цель: пробросить настоящий код/текст ошибки от провайдера в UI.

## Routing-решение

| Параметр | Значение | Почему |
|---|---|---|
| `--type` | `bugfix` | Точечный фикс, без смены архитектуры |
| Агент | claude (по таблице, codex недоступен — лимиты) | По routing-таблице `bugfix → claude` |
| Подсказка | rails-architecture-analyst sub-agent | Перед правкой нужно понять цепочку: где формируется сообщение, какие компоненты в ней участвуют |
| Branch | `fix-24-transcription-error-text` | Префикс `fix-<issue>-...` |
| Base | `main` | На момент демо HEAD = 3386016 |
| Zellij session | `testword1` (передан явно через `--session`) | Оркестрирующий процесс (claude harness) находится вне zellij, поэтому `--session` обязателен |

## Команда запуска

```bash
scripts/start-task.sh fix-24-transcription-error-text \
  --type bugfix \
  --issue https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24 \
  --session testword1
```

## Stdout прогона

```
[start-task] session=testword1  type=bugfix  agent=claude  base=main  branch=fix-24-transcription-error-text
[start-task] creating worktree .worktrees/fix-24-transcription-error-text from main
Preparing worktree (new branch 'fix-24-transcription-error-text')
HEAD is now at 3386016 HW-3: orchestration infra — worktree init, start-task wrapper, routing
[start-task] running init in .worktrees/fix-24-transcription-error-text
[init] worktree: …/.worktrees/fix-24-transcription-error-text
[init] trusting mise config and installing tools
mise WARN  No untrusted config files found.
mise all tools are installed
[init] no .gitmodules found, skipping submodules
[init] copying local config from /Users/oleghasjanov/Documents/projects/video-chat-and-translator
[init] keeping existing .env
[init] keeping existing .envrc
[init] allowing direnv for this worktree
[init] ready
[start-task] opening zellij tab 'fix-24-transcription-error-text' in session 'testword1' and starting claude
[start-task] hint: consider invoking the rails-architecture-analyst sub-agent to map dependencies before editing
[start-task] ready — switch to tab 'fix-24-transcription-error-text' in zellij to interact with the agent
```

## Состояние git после прогона

```
$ git worktree list
/Users/.../video-chat-and-translator                                            0117d33 [main]
/Users/.../video-chat-and-translator/.worktrees/fix-24-transcription-error-text 3386016 [fix-24-transcription-error-text]

$ git -C .worktrees/fix-24-transcription-error-text log --oneline -3
3386016 HW-3: orchestration infra — worktree init, start-task wrapper, routing
964064b integrated eval
711a3fe Merge pull request #25 from OlegPhenomenon/ft-019-subtitles-panel
```

Изоляция: feature-ветка `fix-24-transcription-error-text` создана от main и живёт в отдельной рабочей директории. main worktree продолжает указывать на свежий HEAD `0117d33` (фикс самого start-task.sh, добавленный позже). Параллельная работа никак не пересекается.

## Что произошло в новом zellij-табе

Дамп виджета `zellij --session testword1 action dump-screen --full` через ~1 минуту после запуска (ANSI-форматирование удалено для читаемости):

```
[start-task launch] agent=claude  branch=fix-24-transcription-error-text  type=bugfix
----- prompt -----
Branch: fix-24-transcription-error-text (type: bugfix)

Issue: https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24

Проанализируй issue, согласуй план до правки кода, затем сделай минимальный фикс с тестом. Не выходи за scope.

Routing hint: consider invoking the rails-architecture-analyst sub-agent to map dependencies before editing
------------------

  Claude Code v2.1.126
  Opus 4.7 (1M context) with high effort · Claude Max
  ~/Documents/projects/video-chat-and-translator/.worktrees/fix-24-transcription-error-text

❯ Branch: fix-24-transcription-error-text (type: bugfix)
  Issue: https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24
  ...

⏺ Bash(gh issue view 24 --repo OlegPhenomenon/video-chat-and-translator)
  ⎿  title:     Исправить ошибку неверного ключа
     state:     OPEN
  Searching for 2 patterns, reading 4 files…
  ⎿  video_chat_and_translator/app/frontend/features/videos/transcription/providers.ts

✽ Gallivanting… (1m 9s · ↓ 2.0k tokens · almost done thinking with high effort)
```

Claude корректно:

1. поднялся в правильном worktree (`cwd` совпадает с branch);
2. подхватил routing-prompt как первую реплику;
3. сам прочитал issue через `gh issue view 24`;
4. начал grep/read нужных файлов транскрибации.

Это и есть «один реальный запуск orchestration-инфраструктуры» из формулировки HW-3.

## Артефакты, которые на диске

- Worktree: `.worktrees/fix-24-transcription-error-text/`
- Ветка: `fix-24-transcription-error-text` (от main@3386016)
- Launch-скрипт (gitignored): `.worktrees/fix-24-transcription-error-text/.start-task-launch.sh`
- Prompt-файл (gitignored): `.worktrees/fix-24-transcription-error-text/.start-task-prompt.txt`
- Дамп таба: `/tmp/zellij-dump2.txt`, `/tmp/zellij-dump3.txt`

## Самопроверка по критериям HW-3 Часть 2

| Требование задания | Где проявилось |
|---|---|
| Мультиплексор | zellij 0.44.0 — управляется из внешнего процесса через `--session testword1` |
| Изоляция через git worktree | `.worktrees/fix-24-transcription-error-text/`, отдельный рабочий каталог, главный main не задет |
| Шаг инициализации в новом worktree | `scripts/init.sh` отработал: mise install, перенос `.env*`, `direnv allow` |
| Routing-правило | `--type bugfix` → claude + rails-architecture-analyst hint; источник истины — `docs/orchestration/routing.md` |
| Один реальный запуск | См. секции «Команда» / «Stdout» / «Что произошло в табе» |
| Какую задачу запускали | Issue #24 — backend bugfix цепочки сообщений об ошибке транскрибации |
| Как отротуена | `bugfix` ⇒ агент=claude, sub-agent=rails-architecture-analyst |
| Где создался branch / worktree | `.worktrees/fix-24-transcription-error-text/`, ветка `fix-24-transcription-error-text` от main@3386016 |
| Какой командой стартует execution | `scripts/start-task.sh fix-24-transcription-error-text --type bugfix --issue ... --session testword1` |
| Проверяемый результат | Worktree + ветка + дамп таба с активной claude-сессией, выполнившей `gh issue view`, grep и чтение файлов |

## Замечания (для секции «отличный уровень»)

- В первой версии `start-task.sh` launch-script лежал в `/tmp` и удалялся через `trap EXIT` — гонка с асинхронным `zellij action new-tab`: bash в новом табе читал уже удалённый файл и тихо падал в shell. Пофикшено: prompt и launch-script лежат внутри самого worktree (см. commit `0117d33`), пережили прогон, доступны для post-mortem.
- Поддержка работы оркестратора **снаружи zellij** добавлена этим же коммитом: `--session <name>` или авто-детект единственной сессии. Это критично для сценария, когда оркестрирующий процесс — другой агент или CI-job.
- Routing-таблица — не декоративная: каждая запись меняет минимум одно измерение запуска (агент или подсказка про sub-agent/skill). См. `docs/orchestration/routing.md`.
- Готов к переиспользованию: следующая команда `scripts/start-task.sh <branch> --type <type> --session testword1` создаст ещё один параллельный worktree и таб без ручных действий.
