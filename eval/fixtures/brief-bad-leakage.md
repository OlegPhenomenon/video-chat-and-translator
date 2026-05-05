# Brief: Система авторизации через Devise

## Проблема

Сейчас приложение не использует гем `devise` для аутентификации. Нет модели `User` в `app/models/user.rb`, нет миграции `create_users`, нет контроллера `Users::SessionsController`. Нужно подключить devise с модулем `:confirmable`, настроить `config/initializers/devise.rb` с `mail_sender` и реализовать callback URL `/users/confirmation` через ActionMailer с deliver_later в Sidekiq.

## Для кого

Пользователи.

## Контекст

Задача из GitHub Issue.

## Желаемый результат

Приложение использует devise для авторизации с подтверждением email через ActionMailer.
