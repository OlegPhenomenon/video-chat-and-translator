---
title: Architecture Patterns
doc_kind: domain
doc_function: canonical
purpose: Каноничное место для архитектурных границ проекта. Читать при изменениях, затрагивающих модули, фоновые процессы, интеграции или конфигурацию.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Architecture Patterns

Парадигма проекта: **Ruby on Rails 8 + Inertia.js + React**.
Несмотря на использование мощного фреймворка (Rails), архитектурный принцип "Толстый клиент / Тонкий бэкенд в плане медиа" сохраняется: бэкенд не обрабатывает медиа-файлы, все ML операции (ONNX WASM) крутятся на клиенте.

## Module Boundaries

| Context | Owns | Must not depend on directly |
| --- | --- | --- |
| `backend (Rails)` | Роутинг (Inertia), аутентификация, БД (Active Record), генерация карточек Anki, Telegram bot API | Обработка тяжелых медиа, прямой рендер React |
| `client-core (React)` | UI интерфейсы (Inertia pages), координация ML-воркеров, Web Audio API | Прямой доступ к БД сервера |
| `ai-workers` | Web Workers (WASM ONNX) для инференса моделей на клиенте | UI DOM, компоненты React, Inertia router |
| `tutor-sandbox` | Изолированная среда выполнения JS/Python (WebContainers/Pyodide) | Файловая система хоста, основной контекст браузера |
| `extension` | Browser extension (перехват видео-тегов на сторонних ресурсах) | Внутренние API-роуты без авторизации |

## Backend / Frontend Bridge (Inertia)

- Rails отвечает за маршрутизацию и подготовку данных (Контроллеры).
- Данные передаются на клиент в виде JSON пропсов через Inertia.js.
- Избегать создания избыточных API-эндпоинтов, если данные можно передать начальным props'ом страницы.

## Concurrency And Critical Sections

- **Rails Backend:** Выполнение фоновых задач (отправка карточек Anki в Telegram) делегируется на фоновые воркеры (ActiveJob, Sidekiq/SolidQueue).
- **Frontend ML:** Только одна тяжелая ML-модель в фокусе браузера активно использует CPU/GPU. Web Audio синхронизируется через строгий тайминг-менеджер.

## Failure Handling And Error Tracking

- **Graceful Degradation:** Если локальная ONNX-модель в браузере падает по OOM, система переключается на fallback или просит внешний ключ API. Ошибки WASM логируются через клиентский Sentry (или аналог).
- **Backend:** Стандартная обработка ошибок Rails, спасение от `ActiveRecord::RecordNotFound`, логирование через Rails Logger.
