---
title: Task Workflows
doc_kind: governance
doc_function: canonical
purpose: Маршрутизация задач по типам и базовый цикл разработки. Читать при получении новой задачи для выбора подхода.
derived_from:
  - ../dna/governance.md
  - feature-flow.md
canonical_for:
  - task_routing_rules
  - base_development_cycle
  - workflow_type_selection
  - autonomy_gradient
status: active
audience: humans_and_agents
---

# Task Workflows

## Базовый цикл

Любой workflow — цепочка повторений одного цикла:

```text
Артефакт → Ревью → Полировка
                  → Декомпозиция
                  → Принят
```

Артефакт — то, что создаётся на каждом этапе: спецификация, дизайн-док, план, код, PR, статические ассеты.

### Правило ревью (anti-autopilot)

Если workflow содержит этапы **feature package** или **implementation plan**, то переход на следующий этап запрещён, пока артефакт не принят на ревью.

- Ревью должен выполняться **не тем агентом**, который создал артефакт (или человеком).
- Результат ревью должен быть зафиксирован как ссылка/комментарий в task tracker (issue/ticket) и/или как evidence в feature package.

### Правило разрешения конфликтов инструкций (Memory Bank > agent persistence)

Если внешние инструкции агента (например, “не останавливаться, пока не решено”) конфликтуют с gates из `flows/feature-flow.md`, приоритет имеет Memory Bank:

- **Остановка для ревью = корректное завершение текущего шага.** Это не “недоделка”, а handoff на следующий актор (другой агент/человек).
- После создания/обновления `feature.md` или `implementation-plan.md`, когда gate требует ревью, агент обязан **остановиться** и запросить approve/evidence, а не продолжать к коду “для завершения задачи”.

## Градиент участия человека

Чем ближе к бизнес-требованиям, тем больше участия человека. Чем ближе к изолированному коду и локальному verify, тем больше агент работает автономно.

```text
Бизнес-требования  ← человек  |  агент →  Код
  PRD, Use Cases      Спека, План           PR, Тесты
```

## Типы Workflow

### 1. Малая фича (Rails Backend / React Component)
Когда:
- задача понятна;
- scope локален на одном слое (только UI или только Rails API);
- решение помещается в одну сессию или один компактный change set.
Flow:
`issue/task -> routing -> implementation -> tests (RSpec/Vitest, локально в Docker/devcontainer) -> review -> merge`

### 2. Средняя или большая фича (Full-Stack)
Когда:
- затрагивает несколько слоёв: миграция в БД (Rails) + Inertia props + React компонент;
- требует design choices, нового use-case;
- нужны explicit checkpoints и execution plan.
Flow:
`issue/task -> spec -> feature package -> review gate -> implementation plan -> review gate -> execution -> review -> release check -> handoff`

### 3. Интеграция / Обновление новой ML-модели (ONNX WASM)
*Специфичный workflow проекта*
Когда:
- Подлежит замене/добавлению нейросеть (Whisper, TTS) в браузерной песочнице `ai-workers`.
Flow:
1. `Research`: Тестирование метрик памяти новой модели (вероятность Out of Memory в браузере).
2. `feature package` должен фиксировать **Fallback** механизм, если устройство не тянет веса WebGPU.
3. `implementation`: Обновление JS-биндинга WASM в директории воркеров.
4. `verification`: Ручное ревью таймингов и отсутствия "лагов" на YouTube-плеерах. Прямой `merge` силами AI запрещен.

### 4. Браузерное расширение (Extension Hack)
*Специфичный workflow проекта*
Когда:
- Новые инъекции интерфейса на сторонне сайты (YouTube, Coursera).
Flow:
`task -> CSP/CORS analysis -> content_script modification -> unpack extension test in browser -> manifest update justification -> review`

### 5. Баг-фикс / Рефакторинг
Когда:
- Падения инференса у пользователей, ошибки Rails, проблемы с ducking звука.
Flow:
`report -> local reproduction (strict) -> fix -> regression spec -> review`

## Routing Rules

Используй минимальный workflow, который не теряет контроль над риском.
- Маленькая задача — локальный issue.
- Изменения `manifest.json` расширения или тяжелых моделей ONNX — всегда через большой Workflow "Средняя или большая фича" с ручной супервизией человека.
- Изменение таймингов аудио требует локального ручного тестирования.
