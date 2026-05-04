# Demo run — Issue #24 (HW-3 Часть 2)

Демонстрационный прогон orchestration-инфраструктуры на реальной задаче из репозитория. Показывает, как одна команда `scripts/start-task.sh` создаёт изолированный worktree, инициализирует его, запускает агента в отдельном zellij-табе и применяет routing-правило.

## Задача

- Issue: [#24 — Исправить ошибку неверного ключа](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24)
- Симптом: при невалидном API-ключе транскрибации UI показывает общее сообщение «Не удалось выполнить запрос к провайдеру. Возможны проблемы сети или CORS», вместо реальной причины (401/неверный ключ).
- Цель: пробросить настоящий код/текст ошибки от провайдера в UI.

## Routing-решение

| Параметр | Значение | Почему |
|---|---|---|
| `--type` | `bugfix` | Точечный фикс, без смены архитектуры |
| Агент | claude (по таблице) | codex недоступен (лимиты), не релевантно |
| Подсказка | rails-architecture-analyst sub-agent | Перед правкой нужно понять цепочку: где формируется сообщение, какие сервисы/контроллеры/JS-компоненты в ней участвуют |
| Branch | `fix-24-transcription-error-text` | Префикс `fix-<номер>-...` |
| Base | `main` | На момент демо HEAD = 964064b |

## Команда запуска

```bash
scripts/start-task.sh fix-24-transcription-error-text --type bugfix --base main
```

Что делает скрипт:
1. Создаёт worktree `.worktrees/fix-24-transcription-error-text/` и ветку `fix-24-transcription-error-text` от `main`.
2. Запускает `scripts/init.sh` внутри worktree: `mise install`, копирует `.env*` и `.envrc` из main, `direnv allow`.
3. Открывает новую zellij-вкладку с именем `fix-24-transcription-error-text`, cwd установлен в worktree.
4. Стартует `claude` в этой вкладке.
5. Печатает подсказку про `rails-architecture-analyst`.

## Первая реплика агенту

После того как claude поднялся в новом табе, скопировать туда:

```
Issue для работы: https://github.com/OlegPhenomenon/video-chat-and-translator/issues/24

Перед правкой кода используй sub-agent rails-architecture-analyst, чтобы:
1. Найти, где формируется сообщение «Не удалось выполнить запрос к провайдеру…»
2. Построить полную цепочку: фронтенд (где показывается) → транспорт (как пробрасывается) → backend/Rails или прямой вызов провайдера → точка где теряется реальная причина ошибки.
3. Предложить минимальное изменение, чтобы реальный текст ошибки от провайдера дошёл до UI.

Не трогай архитектуру, не делай рефакторинг. Только точечный фикс с тестом.
Когда план будет готов — покажи его и дождись подтверждения, перед тем как править код.
```

## Артефакты прогона

Заполняются по факту демо.

### Команда и её stdout

```
$ scripts/start-task.sh fix-24-transcription-error-text --type bugfix --base main

<paste output>
```

### Worktree

```
$ git worktree list
<paste>
```

### Ветка в локальном репо

```
$ git -C .worktrees/fix-24-transcription-error-text log --oneline -5
<paste>
```

### Скриншот zellij

`screenshots/hw-3/zellij-issue-24.png`

### Diff после работы агента

```
$ git -C .worktrees/fix-24-transcription-error-text diff main..HEAD --stat
<paste>
```

### PR (если открывался)

- URL: <fill in>
- Базовая ветка: main
- Состояние: <draft/open/merged>

## Самопроверка по критериям HW-3

| Требование задания | Где проявилось |
|---|---|
| Мультиплексор | zellij 0.44.0, новый таб создан скриптом |
| Изоляция через git worktree | `.worktrees/fix-24-transcription-error-text/`, отдельный рабочий каталог |
| Шаг инициализации | `scripts/init.sh` — toolchain, env-перенос, direnv |
| Routing-правило | `--type bugfix` → claude + rails-architecture-analyst hint |
| Один реальный запуск | Этот документ + diff/PR |
| Отротуена ли задача | Да, через таблицу в `docs/orchestration/routing.md` |
| Где создался branch / worktree | См. секции выше |
| Какой командой стартует execution | `scripts/start-task.sh ...` (одна команда) |
| Проверяемый результат | Diff/PR + скриншот zellij |

## Замечания после прогона

<пишутся после демо: что сработало, что неудобно, что улучшить — для секции «отличный уровень» сдачи>
