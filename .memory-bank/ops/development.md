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

Для старта требуются: Ruby (3.2+), Node.js (v20+), PostgreSQL (или встроенный SQLite, в зависимости от `database.yml`).

```bash
# Установка Ruby-зависимостей
bundle install

# Установка Node-зависимостей (React, Tailwind, WASM tools)
npm install # или yarn / pnpm

# Настройка локальной БД среды
rails db:setup
```

## Daily Commands

```bash
# Запуск всего стека (Rails сервер + Frontend сборщик/Vite + background workers)
bin/dev

# Сборка браузерного расширения
npm run build:extension --watch
```

## Browser Testing And Extension

- **Web App:** Доступно локально на `http://localhost:3000`. Inertia.js отдает React-страницы с Rails-сервера. Ассеты и WASM модели доставляются через Vite dev server.
- **Browser Extension:** Для тестирования расширения необходимо:
  1. Запустить сборку `npm run build:extension`.
  2. Открыть в браузере `chrome://extensions/`.
  3. Включить "Developer mode".
  4. Нажать "Load unpacked" и выбрать папку сборки расширения (например, `frontend/extension/dist`).

## Database And Services

- Полноценная разработка использует Active Record миграции (`rails db:migrate`).
- Фоновые задачи (Telegram Bot, Anki sync) запускаются через SolidQueue или Sidekiq (уточняется в конфиге Rails), которые автоматически поднимаются через `bin/dev`.
