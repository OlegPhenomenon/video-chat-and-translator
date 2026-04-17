---
title: Autonomy Boundaries
doc_kind: engineering
doc_function: canonical
purpose: Границы автономии агента: что можно делать без подтверждения, где нужна супервизия, когда эскалировать.
derived_from:
  - ../dna/governance.md
canonical_for:
  - agent_autonomy_rules
  - escalation_triggers
  - supervision_checkpoints
status: active
audience: humans_and_agents
---

# Autonomy Boundaries

Стэк: Rails 8, Inertia, React, ML WASM, Extensions. Возлагает ответственность как за backend (ORM), так и за изолированные веб-воркеры.

## Автопилот — делай без подтверждения

- Написание и редактирование контроллеров Rails, React-компонентов (Inertia) **после** прохождения review gates для upstream-артефактов (feature package и implementation plan), если задача относится к “средней/большой фиче” (см. `flows/workflows.md`).
- Изоляция JS-нагрузок на веб-воркеры.
- Запуск локальных линтеров (Rubocop, ESLint) и автотестов (RSpec, Vitest).
- Генерация миграций БД (но их запуск в production см. ниже).
- Создание и обновление документов в `memory-bank`.

## Stop Conditions (handoff is progress)

Если gate в `flows/feature-flow.md` требует ревью/approve, агент обязан остановиться и запросить ревью. Это считается выполнением текущего шага по workflow и не конфликтует с “пersistence” принципами.

## Супервизия — делай, но покажи на контрольной точке

- **Схема БД:** Накатывание миграций Active Record на базу данных (даже локальную) меняет `schema.rb` и всегда требует короткой проверки архитектуры.
- **Model Injection:** Внедрение новых массивных WASM-моделей ИИ в клиентский бандл.
- **Extension Privileges:** Обновление `manifest.json`.
- **Inertia Props:** Рефакторинг глобальных props'ов, передаваемых в корневые компоненты (увеличивает вес JSON на каждый запрос).
- **DOM Hacking:** Инъекции поверх сторонних сайтов (YouTube).

## Эскалация — остановись и спроси

- Изменение контракта `postMessage` между браузерным расширением и сервером Rails/клиентом. Высокий риск разорвать обратную совместимость старых плагинов.
- **Audio Sync:** Изменения логики синхронизации WebAudio и таймингов. Одно неверное движение в воркерах сломает ключевую фичу "Синхронного локального дубляжа".
- Изменение конфигурации `credentials.yml.enc`.
- Необходимость совершить destructive rollback БД-миграции на production.
