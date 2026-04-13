---
title: Release And Deployment
doc_kind: engineering
doc_function: canonical
purpose: Релизный процесс Rails-приложения и браузерного расширения.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Release And Deployment

Релизный процесс разбит на два независимых потока: Ruby on Rails 8 бэкенд и Браузерное расширение.

## Release Flow

1. **VCS Merge:** Слияние фичи в ветку `main`. Прогонка тестов RSpec и Vitest на Github Actions.
2. **Rails Deployment:**
   - Деплой на production сервер (например, при помощи Kamal или облачного PaaS).
   - Выполняется сборка ассетов и бандлов Vite (`rails assets:precompile`).
   - Автоматически запускаются миграции БД (`rails db:migrate`).
   - Перезапускается веб-сервер Puma и фоновые процессы.
3. **Browser Extension Release:**
   - После стабилизации фичи обязательно обновляется поле `version` в `manifest.json`.
   - CI собирает `.zip` архив расширения.
   - Архив вручную загружается в Chrome Web Store на модерацию (может занимать до нескольких дней).

## Release Checks (Smoke Plan)

При крупных обновлениях необходимо убедиться:
- Транскрибация/TTS-модели успешно грузятся на клиенте в Web Workers (Inertia страницы отдают бандлы с нужными путями сервера).
- Наложение аудио корректно работает поверх окна YouTube.
- Инъекции расширения не конфликтуют с токенами CSRF сервера, когда шлют запросы.

## Rollback Constraints

- **Временные затраты расширения:** Откат расширения в Chrome Store невозможен мгновенно. Изменения Rails API должны обладать строгой обратной совместимостью как минимум на одну минорную версию до обновления расширений у клиентов.
- **Rails App:** Откат кода на сервере возможен (например, `kamal rollback` или возврат репозитория). Но откат миграций базы данных `rails db:rollback` в production — опасная операция, требующая особого ручного подтверждения.
