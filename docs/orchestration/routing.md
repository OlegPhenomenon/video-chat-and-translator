# Routing для агентных задач

Документ описывает, как задача в этом репозитории попадает в нужного агента, режим и набор skill/sub-agent'ов. Используется `scripts/start-task.sh` через флаг `--type`.

## Зачем нужен routing

Не все задачи одинаковые. Для ревью PR не нужен агент с большим thinking-бюджетом. Для написания спецификации, наоборот, важна аккуратность к деталям и медленный режим. Без явного routing скрипт `start-task.sh` всегда стартует одну и ту же конфигурацию и теряет половину пользы от того, что у нас несколько инструментов.

Routing — это таблица соответствий «тип задачи → выбранный агент → какие skill/sub-agent активировать → начальный промпт». `start-task.sh --type <task-type>` использует эту таблицу и собирает запуск.

## Стек проекта (контекст для решений)

- Backend: Rails (Ruby 3.4.8) во вложенной `video_chat_and_translator/`
- Frontend: Inertia + React
- Тесты: RSpec (бэкенд), Vitest (фронт), Capybara + Cuprite (system specs)
- Документация и фичи: Memory Bank (`.memory-bank/`), feature-flow через `flows/feature-flow.md`
- Доступные агенты: `claude` (Claude Code), `codex` (OpenAI Codex CLI — лимиты могут заканчиваться)

## Таблица routing'а

| `--type` | Агент | Подсказки skill / sub-agent | Когда выбирать |
|---|---|---|---|
| `spec` | claude | `rails-architecture-analyst`, `spec-reviewer:spec-review` | Создание `feature.md` или ревью спецификации в `.memory-bank/features/FT-XXX/` |
| `feature` | claude | `rails-architecture-analyst`, при UI — `frontend-design` | Реализация фичи по уже одобренному плану |
| `frontend` | claude | `frontend-design`, `playwright-cli` | UI/UX работа в `app/javascript/` (React + Inertia) |
| `bugfix` | claude | `rails-architecture-analyst` | Точечный фикс из `TODO.md`, без смены архитектуры |
| `test` | claude | `rails-qa-test-investigator` | Только тесты — RSpec system/unit, Vitest |
| `review` | codex (fallback claude) | `pr-review-fix-loop:codex-pr-review` | Ревью своего PR перед merge |
| `docs` | claude | `sc:document` | Обновление `docs/`, Memory Bank, README |
| `refactor` | claude | `rails-architecture-analyst` | Рефакторинг существующего кода без новой функциональности |
| `freeform` | claude | — | Когда тип не подходит ни под одну категорию; routing молча запускает claude |

`codex` указан только для `review`, потому что для быстрого критического чтения PR он часто экономнее. Если лимиты codex исчерпаны — `start-task.sh` прозрачно откатывается на claude.

## Как routing превращается в запуск

`scripts/start-task.sh --type <type> <branch>` делает следующее:

1. Создаёт worktree `.worktrees/<branch>` (см. `scripts/init.sh`).
2. Берёт строку из таблицы выше по `<type>`.
3. Выбирает binary (`claude` или `codex`), при недоступности codex — fallback на claude.
4. Открывает таб zellij, стартует агента в worktree.
5. Печатает в STDOUT подсказку, какие skill/sub-agent имеет смысл подключить руками в первой реплике агента (полностью автоматизировать выбор skill через CLI claude нельзя — он активируется внутри сессии).

`--type` можно опустить — тогда применяется `freeform` (просто claude без подсказок).

## Примеры запуска

```bash
# новая фича: создаём ветку, открываем claude в новом zellij-табе,
# скрипт подскажет про rails-architecture-analyst
scripts/start-task.sh ft-022-recordings --type feature

# точечный фикс из TODO.md
scripts/start-task.sh fix-signout-feedback --type bugfix

# написание system spec из tech debt
scripts/start-task.sh test-dashboard-system-specs --type test

# ревью своего PR через codex (если есть лимиты), иначе claude
scripts/start-task.sh review-ft-021 --type review --base ft-021-task-routing
```

## Принципы добавления новых типов

1. Тип должен соответствовать **повторяющемуся** классу задач — если категория встречается раз в полгода, держи её в `freeform` и не плоди записи.
2. Запись должна менять **хотя бы одно** реальное измерение запуска: агент, sub-agent, начальный промпт. Иначе это декоративный routing — то, против чего предупреждает HW-3.
3. После добавления типа обнови таблицу здесь и `case` в `scripts/start-task.sh` синхронно. Они должны соответствовать друг другу.

## Связанные материалы

- Задание HW-3, Часть 2 — orchestration ([docs HW-3](https://ai-swe-1.thinknetica.com/week/3/homework/))
- Курсовой материал — [Роутинг задач](https://ai-swe-1.thinknetica.com/materials/orchestration/task-routing/)
- `scripts/start-task.sh` — реализация запуска
- `scripts/init.sh` — инициализация worktree
- `.memory-bank/flows/feature-flow.md` — процесс создания фич, в который встраивается routing для типов `spec` / `feature`
