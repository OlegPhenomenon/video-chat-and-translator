---
title: Coding Style
doc_kind: engineering
doc_function: convention
purpose: Coding style и архитектурные конвенции проекта (Rails, Inertia, React, WASM).
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Coding Style

## General Tooling Contract

Проект разделен на Ruby и TypeScript/JS части. Используются следующие линтеры:
- **Ruby:** `rubocop` (Rails стиль по-умолчанию)
- **Frontend / React:** `eslint` + `prettier`
- **Typings:** `tsc --noEmit`

## Backend Addendum (Rails 8)

- **Толстые модели, тонкие контроллеры:** Бизнес логика выносится в модели Active Record (Anki/Статистика), контроллеры отвечают только за роутинг и рендер Inertia пропсов.
- **Security:** Использование стандартного Rails CSRF, Parameters Strong-typing.

## Frontend Addendum (Inertia + React + Web workers)

- **State Management:** Поскольку данные предоставляются с бэкенда через Inertia, избегайте дублирования состояния в React-стэйт без необходимости навигационных изменений (формы и локальные UI компоненты используют хуки React).
- **Styling:** TailwindCSS как движок верстки. Использование инлайн стилей `style={...}` разрешено только для динамических показателей графиков аудио-плеера в `requestAnimationFrame`.
- **Workers Interaction:** React не должен быть `god-object`. Бизнес-логика ML (транскрибация ONNX, работа с микрофоном для Tutor Sandbox) выносится в Web Workers. UI получает только callback-события или Promises, а не напрямую занимается `postMessage`.

## Extension Addendum

- При встраивании в DOM других сайтов избегайте засорения оригинальных стилей (применяйте Shadow DOM там, где это целесообразно).
