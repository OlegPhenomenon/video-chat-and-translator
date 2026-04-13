---
title: Configuration Guide
doc_kind: engineering
doc_function: canonical
purpose: Правила работы с переменными окружения, Rails Credentials и конфигурацией AI-моделей.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Configuration Guide

Стек Ruby on Rails + Inertia диктует специфичные способы управления доступом и конфигурацией.

## File Layout

```text
.env                      # Исключительно локальные переопределения
config/database.yml       # Коннекты к БД
config/credentials.yml.enc# Секреты Rails-окружения (шифрованные)
```

## Backend Config & Secrets

В Rails 8 все production-секреты управляются централизованно через Credentials `Rails.application.credentials`. Сервер не полагается на сырые `.env` файлы в production, если это не предписано инфраструктурой (Docker/Kamal ENV).

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Подключение к основной БД (Postgres) |
| `telegram_bot.token`| Хранится в `credentials.yml.enc`; токен бота для Anki |
| `secret_key_base`| Мастер-соль шифрования сессий Rails |

## Public Frontend Config

Переменные для фронтенда попадают к клиенту при сборке (если используется `.env` для Vite, `VITE_*`) или передаются с Rails серверов через свойства Inertia (`page.props`). 

| Variable | Description |
| --- | --- |
| `VITE_MODELS_CDN` / props | Ссылка на CDN для скачивания ML-весов ONNX в браузер. |

**Важное правило:** Запрещено выводить наружу (во фронт) ключи LLM-провайдеров через рендер Rails. Приложение либо использует мощность устройства (WASM), либо требует от пользователя загрузить собственный ключ прямо в LocalStorage браузера.

## AI Models Configuration

Размеры локальных моделей и fallback-логика не прошиваются в `.env`, они должны конфигурироваться автоматически на клиенте в `ai-workers` в зависимости от `navigator.hardwareConcurrency` пользователя или GPU-возможностей платформы (WebGPU).
