# Контекст проекта

## Стек
- Rails 8.1.3, Vite 8, React 19, Inertia.js 3, Tailwind CSS 4
- PostgreSQL 17, Redis, Sidekiq
- Docker (web + db + redis + sidekiq)
- RSpec для backend тестов

## Что уже реализовано

| Фича | Статус | Ключевые файлы |
|---|---|---|
| Авторизация (Devise confirmable) | DONE | `app/models/user.rb`, `app/controllers/users/sessions_controller.rb`, `app/controllers/users/registrations_controller.rb` |
| Сброс пароля (Devise recoverable) | DONE | `app/controllers/users/passwords_controller.rb` |
| Профиль пользователя | DONE | `app/controllers/users/profile_controller.rb`, `app/controllers/users/profile/emails_controller.rb`, `app/controllers/users/profile/passwords_controller.rb` |
| Dashboard | DONE | `app/controllers/pages/dashboard_controller.rb`, `app/frontend/pages/Dashboard.tsx` |
| Header/навигация | DONE | `app/frontend/components/Header.tsx` |
| Toast-уведомления | DONE | `app/frontend/components/Toast.tsx` |
| i18n (русская локализация) | DONE | `config/locales/ru.yml` |

## Архитектурные правила
- Контроллеры только CRUD (без бизнес-логики в контроллерах)
- Фронтенд: React + Inertia.js + TypeScript + Tailwind CSS
- Файлы в `app/frontend/pages/` для Inertia-страниц
- Background jobs через Sidekiq
- Все тексты через i18n (`config/locales/ru.yml`)

## База данных
- Таблица `users` с полями: email, encrypted_password, confirmed_at, confirmation_token, unconfirmed_email
- Нет таблиц для видео, файлов и т.п.
