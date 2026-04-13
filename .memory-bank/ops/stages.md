---
title: Stages And Non-Local Environments
doc_kind: engineering
doc_function: canonical
purpose: Доступ к production окружениям (Rails), стендам фронтенда и логам Telegram-бота.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Stages And Non-Local Environments

Архитектура проекта состоит из монолита Ruby on Rails 8 (который раздает фронтенд на базе Inertia.js и API) и браузерных расширений.

## Environment Inventory

| Environment | Purpose | Hosting | Access |
| --- | --- | --- | --- |
| `production (web)` | Главный сервер (Rails App / DB / Background Jobs) | Kamal (VPS) / Render / Heroku | Доступ через SSH / PaaS Dashboard |
| `production (ext)` | Браузерное расширение | Chrome Web Store / Firefox Add-ons | Developer Dashboard |
| `staging` | Переходная среда (если есть) | PaaS / VPS | Доступ по URL / IP |

## Logs And Observability

- **Frontend Errors (React/ML):** Ошибки браузерного ML инференса (OOM моделей, сбои Web Audio/WebGPU) отслеживаются через клиентские инструменты мониторинга (Sentry Browser).
- **Backend Logs:** Логи Rails-сервера, базы данных (PostgreSQL) и background воркеров (SolidQueue/Sidekiq для бота Telegram) доступны в консоли платформы хостинга (или через `docker logs` / Kamal).

## Secrets And Credentials

- Используется встроенный в Rails механизм зашифрованных доступов: `config/credentials.yml.enc`. Редактируется командой `EDITOR=nano rails credentials:edit`.
- Ключи от внешних сервисов (Telegram Bot, базы данных) хранятся **только** там или в изолированных переменных среды сервера `ENV`. Клиенту (в бандл React) они не попадают.
