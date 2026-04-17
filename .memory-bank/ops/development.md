---
title: Development Environment
doc_kind: engineering
doc_function: canonical
purpose: Локальная разработка. Настройка среды для Ruby on Rails 8 + Inertia + React, расширения.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Development Environment

Проект является полностековым Ruby on Rails 8 приложением с тяжелым клиентом на базе React + Web Workers.

## Setup

Проект запускается и проверяется **через Docker Compose**.

Для старта на машине требуется только Docker (Compose v2) и доступ к репозиторию.

```bash
# Build images
docker compose -f docker/docker-compose.yml build

# Start the full stack (Rails + Vite + services)
docker compose -f docker/docker-compose.yml up
```

## Daily Commands

```bash
# Stop the stack
docker compose -f docker/docker-compose.yml down

# Run a one-off command inside the web container
docker compose -f docker/docker-compose.yml run --rm web <command>

# Сборка браузерного расширения
npm run build:extension --watch
```

## Browser Testing And Extension

- **Web App:** Доступно на `http://localhost:3100` (см. `docker/docker-compose.yml`). Inertia.js отдает React-страницы с Rails-сервера. Ассеты и WASM модели доставляются через Vite dev server.
- **Browser Extension:** Для тестирования расширения необходимо:
  1. Запустить сборку `npm run build:extension`.
  2. Открыть в браузере `chrome://extensions/`.
  3. Включить "Developer mode".
  4. Нажать "Load unpacked" и выбрать папку сборки расширения (например, `frontend/extension/dist`).

## Database And Services

- Полноценная разработка использует Active Record миграции (`rails db:migrate`).
- Фоновые задачи (Telegram Bot, Anki sync) запускаются через SolidQueue или Sidekiq (уточняется в конфиге Rails) и поднимаются отдельным сервисом в `docker/docker-compose.yml`.
