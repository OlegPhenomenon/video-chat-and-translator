---
title: Testing Policy
doc_kind: engineering
doc_function: canonical
purpose: Testing policy репозитория. Требования к покрытию Rails API, ML воркеров и браузерному расширению.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
audience: humans_and_agents
---

# Testing Policy

## Project Adaptation

Основной стек тестирования в Rails 8 + React приложении:
- **Backend (Ruby/Rails):** `rspec-rails` (или `minitest`). Интеграционные тесты контроллеров и моделей.
- **Frontend (TS/React):** `vitest` + `@testing-library/react` для клиентской инкапсулированной логики воркеров и сложных компонентов.
- **Data (Backend):** FactoryBot / Fixtures.
- **Local commands:** `bundle exec rspec`, `npm run test`, `npm run type-check`.

## Core Rules

- Логика бэкенда (управление подписками, статистика Anki, Telegram webhooks) *полностью* покрывается Specs (контроллеры, базы данных и фоновые джобы).
- Модули таймингов субтитров и смещения `AudioContext` в браузере покрываются точными `vitest` unit-тестами.
- Тестирование Machine Learning ONNX инференса на CI-серверах выполняется стабами. Полный прогон не автоматизируется из-за ограничения CPU на раннерах.
- Любые изменения, затрагивающие change surface фичи, должны сопровождаться тестами (RSpec/Vitest по месту) и **локальный прогон должен быть зелёным до пуша в PR**.
- **Execution environment:** локальные тесты и проверки запускаются **в Docker (docker compose)**, а не на хост-машине, чтобы избежать расхождений окружений.
  - Источник истины: `docker/docker-compose.yml` (dev) и `docker/docker-compose.ci.yml` + `scripts/ci-app.sh` (CI parity).
  - `devcontainer` допускается как способ *запустить Docker*, но не является “отдельной” средой проекта и не должен подразумевать запуск `bin/dev` на хосте.

## Manual-Only Exceptions (Ручные ограничения)

Специфика браузерного расширения и "переводчика на лету" требует Manual Verification:

1. **Кросс-доменные iframe (YouTube):** Запуск и инъекция React/Inertia компонентов внутри плееров сторонних сервисов не могут быть запущены в надежном CI-окружении (блокировки CORS). Проверяется разработчиком вручную через сборку расширения.
2. **Audio Ducking Syncing:** "Приглушение" оригинального звука и подгрузка TTS-аудио-дорожек оценивается только человеком на отсутствие лагов.
3. **Изоляция Tutor Sandbox:** Sandboxing-фреймы (WebContainers/Pyodide), в которых LLM генерирует графики (Python Manim), проверяются вручную на отсутствие утечек безопасности при новых изменениях.

## Взаимодействие при внедрении

1. **Unit:** `rspec` (БД) + `vitest` (Аудио, UI фильтры).
2. **Local extension / Integration:** Сборка `npm run build:extension`, ручной инжект на донор-сайт (YouTube) при запущенном `bin/dev`. Плеер перекрыт, запросы к Rails доходят, CSRF-токены верны.
