# Implementation Plan: Профиль пользователя

**Статус:** Ready  
**Спецификация:** `.memory-bank/features/003-user-profile/spec.md`  
**Дата:** 2026-04-05

---

## Grounding: текущее состояние кодовой базы

| Файл | Текущее состояние | Что нужно |
|:---|:---|:---|
| `config/initializers/devise.rb` :160 | `config.reconfirmable = false` | Изменить на `true` |
| `app/controllers/application_controller.rb` :8 | `as_json(only: [:id, :email])` | Добавить `:unconfirmed_email` |
| `config/routes.rb` | Нет маршрутов профиля | Добавить namespace `users/profile` |
| `db/schema.rb` :17-32 | Колонка `unconfirmed_email` **уже есть** | Миграция НЕ нужна |
| `app/controllers/users/` | Есть sessions, registrations, confirmations, passwords | Создать profile_controller, profile/emails_controller, profile/passwords_controller |
| `app/frontend/pages/` | Landing, auth/* | Создать profile/Show.tsx |
| `app/frontend/pages/Landing.tsx` :47-56 | Email + кнопка "Выйти" | Добавить ссылку "Профиль" |
| `config/locales/ru.yml` | auth.login, auth.register, auth.passwords, auth.confirmation | Добавить auth.profile.* |
| `spec/requests/users/` | sessions, registrations, confirmations, passwords, resends | Создать profile_spec, emails_spec, passwords_spec |
| `spec/factories/users.rb` | Есть traits :confirmed, :unconfirmed, :expired_confirmation | Достаточно, новые не нужны |

**Конфликтов с текущей архитектурой нет.** Все новые контроллеры — в отдельных файлах, маршруты добавляются в существующий namespace `users`.

---

## Порядок реализации

### Шаг 1: Конфигурация Devise + расширение shared props (Фича A1)

**Зависимости:** нет  
**Файлы:**
- `video_chat_and_translator/config/initializers/devise.rb` — строка 160
- `video_chat_and_translator/app/controllers/application_controller.rb` — строка 8

**Действия:**

1.1. В `config/initializers/devise.rb` изменить:
```ruby
# Было:
config.reconfirmable = false
# Стало:
config.reconfirmable = true
```

1.2. В `app/controllers/application_controller.rb` расширить shared props:
```ruby
# Было:
inertia_share current_user: -> { current_user&.as_json(only: [ :id, :email ]) }
# Стало:
inertia_share current_user: -> { current_user&.as_json(only: [ :id, :email, :unconfirmed_email ]) }
```

1.3. *(Подзадача — устранение несоответствия паролей)* В `config/locales/ru.yml` строки 48 и 60 содержат `"минимум 8 символов"`, но `devise.rb` настроен на `password_length = 6..128`. Привести в соответствие: оставить `password_length = 6..128` и исправить локаль на "минимум 6 символов", **либо** поменять `password_length = 8..128` (тогда локаль корректна). Решение зафиксировать перед Шагом 3, чтобы плейсхолдер в i18n соответствовал реальной валидации.

**Рекомендация:** изменить `password_length` на `8..128` — локаль уже говорит "8", это более безопасная длина, изменений в тестах минимально.

**Проверка:** Запустить существующие тесты — убедиться, что ничего не сломалось (reconfirmable = true может повлиять на тесты регистрации, т.к. `update` email теперь требует подтверждение).

---

### Шаг 2: Маршруты профиля (Фичи A2–A4)

**Зависимости:** нет  
**Файл:** `video_chat_and_translator/config/routes.rb`

**Действия:**

2.1. В `routes.rb` уже существует блок `namespace :users` (строки 15–19). Добавить маршруты профиля **внутрь этого же блока**, а не создавать новый:
```ruby
# Было (строки 15–19):
namespace :users do
  namespace :confirmations do
    resource :resend, only: [ :create ]
  end
end

# Стало — добавить внутрь существующего блока:
namespace :users do
  namespace :confirmations do
    resource :resend, only: [ :create ]
  end

  resource :profile, only: [ :show ], controller: "profile"

  namespace :profile do
    resource :email, only: [ :update ], controller: "emails"
    resource :password, only: [ :update ], controller: "passwords"
  end
end
```

**Результат маршрутов:**
| HTTP | Path | Controller#action |
|:---|:---|:---|
| GET | `/users/profile` | `users/profile#show` |
| PATCH | `/users/profile/email` | `users/profile/emails#update` |
| PATCH | `/users/profile/password` | `users/profile/passwords#update` |

**Проверка:** `docker compose exec web bin/rails routes | grep profile` — убедиться, что маршруты правильные.

---

### Шаг 3: Локализация (Фича C1)

**Зависимости:** нет (можно делать параллельно с Шагом 2)  
**Файл:** `video_chat_and_translator/config/locales/ru.yml`

**Действия:**

3.1. Добавить секцию `auth.profile` после существующей секции `auth.passwords` (после строки ~44):
```yaml
  profile:
    title: "Настройки профиля"
    link: "Профиль"
    back_to_home: "Назад"
    email:
      section_title: "Изменить email"
      current_email_label: "Текущий email"
      new_email_label: "Новый email"
      new_email_placeholder: "Введите новый email"
      submit: "Сохранить email"
      success: "Письмо подтверждения отправлено на новый адрес."
      pending_confirmation: "Ожидает подтверждения:"
      same_as_current: "совпадает с текущим email"
    password:
      section_title: "Изменить пароль"
      current_password_label: "Текущий пароль"
      current_password_placeholder: "Введите текущий пароль"
      new_password_label: "Новый пароль"
      new_password_placeholder: "Минимум 8 символов"
      password_confirmation_label: "Подтверждение пароля"
      password_confirmation_placeholder: "Повторите новый пароль"
      submit: "Сохранить пароль"
      success: "Пароль успешно изменён."
      forgot_password: "Забыли пароль?"
```

**Проверка:** YAML-валидация (корректные отступы, нет дубликатов ключей).

---

### Шаг 4: Контроллер профиля — show (Фича A2)

**Зависимости:** Шаг 2 (маршруты), Шаг 3 (ключи i18n)  
**Файл:** `video_chat_and_translator/app/controllers/users/profile_controller.rb` (новый)

**Действия:**

4.1. Создать контроллер:
```ruby
# frozen_string_literal: true

module Users
  class ProfileController < ApplicationController
    def show
      render inertia: "profile/Show", props: {
        translations: I18n.t("auth.profile")
      }
    end
  end
end
```

**Решение по наследованию:** Наследоваться от `ApplicationController`, **не** от `InertiaController`. Обоснование: все Devise-контроллеры (sessions, registrations, passwords) наследуют от `ApplicationController`. Профиль семантически ближе к ним, чем к `PagesController`. `InertiaController` сейчас пуст (только закомментированный share), поэтому разницы нет, но явное решение зафиксировано для будущих изменений.

**Примечание:** `email` и `unconfirmed_email` уже приходят через shared props `current_user` (Шаг 1.2). Дублировать в props не нужно.

**Проверка:** `curl` или RSpec — GET `/users/profile` возвращает 200 для авторизованного пользователя, redirect для неавторизованного.

---

### Шаг 5: Контроллер смены email (Фича A3)

**Зависимости:** Шаг 2 (маршруты), Шаг 3 (ключи i18n)  
**Файл:** `video_chat_and_translator/app/controllers/users/profile/emails_controller.rb` (новый)

**⚠️ Важно — паттерн ошибок:** `inertia_rails 3.19.0` **не поддерживает** `redirect_to ..., inertia: { errors: }` (этот паттерн нигде не используется в кодовой базе). При ошибке использовать `render inertia:` — как в `RegistrationsController#create` и `PasswordsController#update`.

**Действия:**

5.1. Создать контроллер:
```ruby
# frozen_string_literal: true

module Users
  module Profile
    class EmailsController < ApplicationController
      def update
        if current_user.email == email_params[:email]
          return render inertia: "profile/Show", props: {
            translations: I18n.t("auth.profile"),
            errors: { email: [ I18n.t("auth.profile.email.same_as_current") ] }
          }
        end

        if current_user.update(email: email_params[:email])
          redirect_to users_profile_path, notice: I18n.t("auth.profile.email.success")
        else
          render inertia: "profile/Show", props: {
            translations: I18n.t("auth.profile"),
            errors: current_user.errors.messages
          }
        end
      end

      private

      def email_params
        params.require(:user).permit(:email)
      end
    end
  end
end
```

**Логика:** При `reconfirmable = true`, `current_user.update(email: new_email)` автоматически:
- Сохраняет новый email в `unconfirmed_email`
- Отправляет письмо подтверждения на новый адрес (через `deliver_later` благодаря переопределённому `send_devise_notification`)
- Оставляет `email` неизменным до подтверждения

**Паттерн:** ошибка → `render inertia: "profile/Show"` с `errors` в props, успех → `redirect_to` с `notice`. Аналогично `RegistrationsController`.

**Проверка:** RSpec — PATCH `/users/profile/email` с валидным/невалидным/занятым/пустым/тем же email.

---

### Шаг 6: Контроллер смены пароля (Фича A4)

**Зависимости:** Шаг 2 (маршруты), Шаг 3 (ключи i18n)  
**Файл:** `video_chat_and_translator/app/controllers/users/profile/passwords_controller.rb` (новый)

**Действия:**

6.1. Создать контроллер:
```ruby
# frozen_string_literal: true

module Users
  module Profile
    class PasswordsController < ApplicationController
      def update
        if current_user.update_with_password(password_params)
          bypass_sign_in(current_user)
          redirect_to users_profile_path, notice: I18n.t("auth.profile.password.success")
        else
          render inertia: "profile/Show", props: {
            translations: I18n.t("auth.profile"),
            errors: current_user.errors.messages
          }
        end
      end

      private

      def password_params
        params.require(:user).permit(:current_password, :password, :password_confirmation)
      end
    end
  end
end
```

**Паттерн:** ошибка → `render inertia: "profile/Show"` с `errors` в props, успех → `redirect_to` с `notice`. Паттерн `redirect_to ..., inertia: { errors: }` **не используется**.

**Логика:** `update_with_password` — стандартный Devise-метод:
- Проверяет `current_password` против хранимого хеша
- Валидирует новый `password` (>=8, совпадение с confirmation)
- `bypass_sign_in` — сохраняет сессию после смены пароля (без повторного входа)

**Проверка:** RSpec — PATCH `/users/profile/password` с правильным/неверным текущим паролем, коротким/несовпадающим новым.

---

### Шаг 7: Страница профиля — React (Фича B1)

**Зависимости:** Шаги 4–6 (контроллеры), Шаг 3 (ключи i18n)  
**Файл:** `video_chat_and_translator/app/frontend/pages/profile/Show.tsx` (новый)

**Действия:**

7.1. Создать страницу. Паттерн по аналогии с `auth/Register.tsx` и `auth/Login.tsx`:
- Обёртка `AuthLayout`
- Две независимые формы (`useForm` из `@inertiajs/react`)
- Ошибки валидации: красная рамка + текст (как в Register)
- Flash-уведомления через существующий Toast-компонент
- Все тексты из props `translations`

**Структура компонента:**
```
profile/Show.tsx
├── AuthLayout
│   ├── Заголовок (translations.title)
│   ├── Секция Email
│   │   ├── Текущий email (из current_user.email)
│   │   ├── Статус unconfirmed_email (если есть)
│   │   ├── Поле "Новый email"
│   │   └── Кнопка "Сохранить email" (PATCH /users/profile/email)
│   ├── Разделитель
│   ├── Секция Пароль
│   │   ├── Поле "Текущий пароль"
│   │   ├── Поле "Новый пароль"
│   │   ├── Поле "Подтверждение пароля"
│   │   ├── Ссылка "Забыли пароль?"
│   │   └── Кнопка "Сохранить пароль" (PATCH /users/profile/password)
│   └── Кнопка "Назад" → Landing
```

**Props интерфейс:**
```typescript
interface Props {
  translations: {
    title: string
    back_to_home: string
    email: { section_title, current_email_label, new_email_label, new_email_placeholder, submit, pending_confirmation, same_as_current }
    password: { section_title, current_password_label, current_password_placeholder, new_password_label, new_password_placeholder, password_confirmation_label, password_confirmation_placeholder, submit, forgot_password }
  }
}
```

`current_user` (с `email`, `unconfirmed_email`) доступен через `usePage().props`.

**Проверка:** Визуальная проверка в браузере + отправка обеих форм.

---

### Шаг 8: Ссылка на профиль из Landing (Фича B2)

**Зависимости:** Шаг 2 (маршрут существует), Шаг 3 (ключ i18n `auth.profile.link`)  
**Файлы:**
- `video_chat_and_translator/app/frontend/pages/Landing.tsx` — строки 47-56
- `video_chat_and_translator/app/controllers/pages_controller.rb` (если нужно передать props)

**Действия:**

8.1. В `Landing.tsx` добавить ссылку "Профиль" рядом с кнопкой "Выйти" (строки 47–56). Использовать `Link` из `@inertiajs/react` с `href="/users/profile"`.

8.2. **Текст ссылки захардкодить как `"Профиль"`** — так же как кнопка "Выйти" уже захардкожена на строке 54. Передавать `profile_link_text` через props из `PagesController` **не нужно** — это создало бы непоследовательный подход (часть текстов Landing через props, часть — хардкод). PagesController трогать не нужно.

**Проверка:** На Landing видна ссылка, клик ведёт на `/users/profile`.

---

### Шаг 9: Автотесты (Фича D1)

**Зависимости:** Шаги 4–6 (контроллеры работают)  
**Файлы:**
- `video_chat_and_translator/spec/requests/users/profile_spec.rb` (новый)
- `video_chat_and_translator/spec/requests/users/profile/emails_spec.rb` (новый)
- `video_chat_and_translator/spec/requests/users/profile/passwords_spec.rb` (новый)

**Паттерн:** по аналогии с `spec/requests/users/sessions_spec.rb` — `sign_in` через Devise test helpers, `FactoryBot.create(:user, :confirmed)`.

**9.1. profile_spec.rb:**
- Авторизованный пользователь → 200 (Inertia render)
- Неавторизованный → redirect на login
- Если есть `unconfirmed_email` → проверять в составе **shared props** `current_user`, а не в page props (данные передаются через `inertia_share` в `ApplicationController`, не через `ProfileController#show`). В request spec использовать Inertia test helpers: `expect(inertia).to render_component("profile/Show")` + проверять `response.body` или `inertia_props[:current_user][:unconfirmed_email]`.

**9.2. emails_spec.rb:**
- Валидный новый email → `unconfirmed_email` обновлён, письмо в очереди, redirect с notice
- Невалидный формат → ошибка валидации
- Пустой → ошибка
- Совпадает с текущим → ошибка "совпадает с текущим"
- Занят другим пользователем → ошибка "уже используется"
- Неавторизованный → redirect

**9.3. passwords_spec.rb:**
- Верный текущий + валидный новый → пароль изменён, сессия сохранена
- Неверный текущий → ошибка `current_password`
- Новый < 8 символов → ошибка `password`
- `password` ≠ `password_confirmation` → ошибка
- Пустой текущий → ошибка
- Неавторизованный → redirect

**Проверка:** `docker compose exec web bundle exec rspec spec/requests/users/profile*` — все тесты зелёные.

---

### Шаг 10: Документация (Фича C2)

**Зависимости:** Шаги 1–9 завершены  
**Файл:** `video_chat_and_translator/docs/features/user-profile.md` (новый)

**Содержание:**
- Описание фичи и потоков (email change flow, password change flow)
- Маршруты (таблица)
- Контроллеры (описание каждого)
- Компоненты (profile/Show.tsx)
- i18n ключи (секция auth.profile)
- Связь с фичами 001 и 002

---

## Граф зависимостей

```
Шаг 1 (Devise config + shared props) ─── независим
Шаг 2 (Маршруты) ────────────────────── независим
Шаг 3 (Локализация) ─────────────────── независим

Шаг 4 (ProfileController#show) ──────── зависит от 2, 3
Шаг 5 (EmailsController#update) ─────── зависит от 1, 2, 3
Шаг 6 (PasswordsController#update) ──── зависит от 2, 3

Шаг 7 (profile/Show.tsx) ────────────── зависит от 1, 4, 5, 6
Шаг 8 (Landing ссылка) ──────────────── зависит от 2, 3

Шаг 9 (Тесты) ───────────────────────── зависит от 1–6
Шаг 10 (Документация) ───────────────── зависит от 1–9
```

**Параллельные группы:**
- **Группа A** (параллельно): Шаги 1, 2, 3
- **Группа B** (параллельно после A): Шаги 4, 5, 6, 8
- **Группа C** (после B): Шаг 7
- **Группа D** (после B): Шаг 9
- **Группа E** (после всех): Шаг 10

---

## Потенциальные риски

| Риск | Митигация |
|:---|:---|
| `reconfirmable = true` может сломать существующие тесты регистрации | Запустить `bundle exec rspec` после Шага 1, исправить если нужно |
| ~~Inertia redirect с `inertia: { errors: }` не поддерживается~~ | **Решено:** контроллеры используют `render inertia:` при ошибках, `redirect_to` только при успехе |
| Несоответствие `password_length` (6) и локали ("минимум 8") | **Решено в Шаге 1.3:** изменить `password_length` на `8..128` |
| `update_with_password` может требовать `current_password` даже для email | Используем отдельные контроллеры — email обновляется через `update`, пароль через `update_with_password` |
| Текст "Профиль" в Landing | **Решено:** захардкодить как "Выйти", не трогать PagesController |

---

## Чеклист завершения

- [ ] Шаг 1: `reconfirmable = true`, shared props расширены, `password_length` и локаль приведены в соответствие (подзадача 1.3)
- [ ] Шаг 2: Маршруты добавлены и проверены через `rails routes`
- [ ] Шаг 3: Ключи i18n добавлены в `ru.yml`
- [ ] Шаг 4: `ProfileController#show` создан и работает
- [ ] Шаг 5: `EmailsController#update` создан и работает
- [ ] Шаг 6: `PasswordsController#update` создан и работает
- [ ] Шаг 7: `profile/Show.tsx` создан и визуально проверен
- [ ] Шаг 8: Ссылка на профиль добавлена в Landing
- [ ] Шаг 9: Все RSpec тесты зелёные
- [ ] Шаг 10: Документация `docs/features/user-profile.md` создана
- [ ] Финал: Полный прогон `bundle exec rspec` — всё зелёное
