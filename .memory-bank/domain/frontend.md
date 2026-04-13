---
title: Frontend
doc_kind: domain
doc_function: canonical
purpose: Шаблон описания UI-поверхностей, design system и i18n-слоя. Читать при работе с web, мобильным или embedded UI.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Frontend

Фронтенд проекта построен на связке **Inertia.js + React**, что исключает необходимость в традиционном клиентском роутере (например, React Router). Маршрутизацию обеспечивает Ruby on Rails.

## UI Surfaces

Основные поверхности платформы:
1. **Public Web App** (Плеер, Дашборд, Настройки платформы) — рендерится как Inertia Page (React).
2. **Interactive Tutor UI & Sandbox** (Чат с ИИ-тьютором и Canvas).
3. **Browser Extension** (Popup меню и Content scripts для инъекций в сторонние сайты).

## Component And Styling Rules

- **Pages vs Components:** Страницы располагаются в директории Inertia-страниц (часто `app/frontend/Pages` в Rails). Переиспользуемые элементы выносятся в `Components`.
- **Theme and Layout:** Для удобства долгого просмотра контента приоритет отдается темной теме (Dark mode). Дизайн строится с помощью Tailwind CSS.
- **Performance:** Приложение использует клиентский ML (Web Workers). UI-компоненты React не должны замирать из-за блокировок Main Thread. Сборка фронтенда в Rails 8 осуществляется через Vite (ViteRuby) или esbuild.

## Interaction Patterns

- **Inertia Protocol:** Переходы между страницами происходят без перезагрузки браузера, запрашивая только JSON от Rails-контроллера. Это критически важно, чтобы не прерывать фоновые ML-вычисления WASM-моделей на клиенте при смене страницы.
- **Overlay Pattern:** Для интеграции YouTube (iframe), интерфейс плеера-переводчика накладывается поверх оригинального `iframe`, налету подставляя сгенерированную аудиодорожку (Ducking).
- **AI Streaming:** Ответы Tutor-модели передаются в реальном времени.

## Localization

- Для Rails-части используется стандартный i18n (`config/locales`).
- Для React-клиента строки передаются либо через Inertia props (если рендерятся сервером), либо через клиентский i18n инструмент локализации, чтобы избежать хардкодных строк.
