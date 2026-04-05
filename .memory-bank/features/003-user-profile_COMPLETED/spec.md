# Specification: Профиль пользователя

**Статус:** Ready for Implementation
**Версия:** 1.1
**Related Issue:** [GitHub Issue #3](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/3)
**Тех. стек:** Ruby on Rails 8, Inertia.js, React, PostgreSQL, Devise 5.0.3, Redis, Sidekiq 8, RSpec.

## 1. Цель

Дать зарегистрированным пользователям с **подтверждённым email** возможность самостоятельно управлять своими учётными данными: просматривать текущий email и изменять его, а также изменять пароль — без обращения в поддержку и без прямого доступа к базе данных.

## 2. Зависимости и контекст

- Фичи 001-auth-email и 002-forgot-password **завершены и смержены**. В проекте реализованы: Devise (`:database_authenticatable`, `:registerable`, `:recoverable`, `:confirmable`, `:validatable`), Inertia-страницы входа/регистрации/подтверждения/сброса пароля, фоновая отправка писем через Sidekiq, русская локализация UI, AuthLayout, Toast-компонент уведомлений, тесты RSpec + FactoryBot.
- Колонка `unconfirmed_email` (string) **уже присутствует** в `db/schema.rb` — была создана в миграции `DeviseCreateUsers`. **Отдельная миграция НЕ НУЖНА.**
- `config.reconfirmable` **сейчас установлен в `false`** в `config/initializers/devise.rb`. Необходимо изменить на `true` для безопасной смены email.
- `current_user` уже передаётся в Inertia shared props (поля `id`, `email`) через `ApplicationController`.
- Метод `User#send_devise_notification` уже переопределён для фоновой отправки через Sidekiq.

## 3. Scope

### Что делаем

- Изменение `config.reconfirmable` на `true` в `config/initializers/devise.rb`.
- Страница профиля (`GET /users/profile`) с отображением текущего email и статуса ожидающего подтверждения (`unconfirmed_email`).
- Смена email (`PATCH /users/profile/email`) с reconfirmable-flow: новый email сохраняется в `unconfirmed_email`, отправляется письмо подтверждения на **новый** адрес, старый email остаётся активным до подтверждения.
- Смена пароля (`PATCH /users/profile/password`) через Devise `update_with_password`: требуется текущий пароль, новый пароль и подтверждение.
- Навигация: ссылка на профиль из Landing.tsx (главная страница авторизованного пользователя).
- UI: единая страница профиля с двумя независимыми формами (email и пароль), стиль согласован с auth-страницами (`AuthLayout`, Tailwind, `useForm`).
- **Локализация:** все тексты через i18n (`config/locales/ru.yml`), передаются через props — без захардкоженных строк в React.
- **Расширение shared props:** добавить `unconfirmed_email` в `current_user` JSON в `ApplicationController`.
- **Интеграционные автотесты (RSpec):** покрывают отображение профиля, смену email, смену пароля, негативные сценарии.
- **Документация:** `docs/features/user-profile.md`.

### Что НЕ делаем (Out of Scope)

- Аватар / фото профиля.
- Имя / фамилия (нет полей в schema).
- Удаление аккаунта.
- Двухфакторная аутентификация (2FA).
- Смена языка интерфейса.
- OAuth и сторонние identity-провайдеры.

---

## 4. Эпики и фичи (vertical slices)

### Эпик A — Backend: Конфигурация и контроллеры профиля

| | |
| :--- | :--- |
| **Фича A1** | Включение `reconfirmable` и расширение shared props |
| **Ценность** | Безопасная смена email: новый адрес требует подтверждения, старый остаётся активным. Фронтенд получает данные об ожидающем подтверждении email. |
| **Deliverables** | 1) Изменить `config.reconfirmable = true` в `config/initializers/devise.rb`. 2) Расширить `inertia_share current_user` в `ApplicationController` — добавить поле `unconfirmed_email` в JSON. |
| **Acceptance criteria** | 1) После изменения email: `user.email` остаётся прежним, `user.unconfirmed_email` содержит новый адрес. 2) После подтверждения нового email: `user.email` обновляется, `user.unconfirmed_email` становится `nil`. 3) `current_user` в Inertia props содержит `unconfirmed_email`. |
| **Затрагиваемые файлы** | `config/initializers/devise.rb`, `app/controllers/application_controller.rb` |

---

| | |
| :--- | :--- |
| **Фича A2** | Контроллер отображения профиля (`Users::ProfileController#show`) |
| **Ценность** | Пользователь видит свои текущие данные (email, статус ожидающего подтверждения). |
| **Deliverables** | 1) Создать `app/controllers/users/profile_controller.rb` с действием `show`. 2) Рендерит Inertia-страницу `profile/Show` с props: `translations` (i18n), `email`, `unconfirmed_email`. 3) Добавить маршрут `GET /users/profile` в `config/routes.rb`. |
| **Acceptance criteria** | 1) Авторизованный пользователь — видит страницу профиля с текущим email. 2) Неавторизованный пользователь — редирект на логин. 3) Если есть `unconfirmed_email` — отображается на странице. |
| **Затрагиваемые файлы** | `app/controllers/users/profile_controller.rb` (новый), `config/routes.rb` |

---

| | |
| :--- | :--- |
| **Фича A3** | Контроллер смены email (`Users::Profile::EmailsController#update`) |
| **Ценность** | Пользователь может изменить свой email с безопасным reconfirmable-flow. |
| **Deliverables** | 1) Создать `app/controllers/users/profile/emails_controller.rb` с действием `update`. 2) Принимает параметр `email`. 3) При успехе: редирект на профиль с flash-уведомлением о необходимости подтверждения. 4) При ошибке: редирект на профиль с ошибками валидации. 5) Добавить маршрут `PATCH /users/profile/email`. |
| **Acceptance criteria** | 1) Валидный новый email → `unconfirmed_email` обновлён, письмо подтверждения поставлено в очередь. 2) Невалидный email → ошибка валидации, `unconfirmed_email` не изменён. 3) Email уже занят другим пользователем → ошибка. 4) Тот же email, что и текущий → ошибка валидации "совпадает с текущим", письмо не отправляется. 5) Пустой email → ошибка валидации. |
| **Затрагиваемые файлы** | `app/controllers/users/profile/emails_controller.rb` (новый), `config/routes.rb` |

---

| | |
| :--- | :--- |
| **Фича A4** | Контроллер смены пароля (`Users::Profile::PasswordsController#update`) |
| **Ценность** | Пользователь может изменить свой пароль, подтвердив текущий. |
| **Deliverables** | 1) Создать `app/controllers/users/profile/passwords_controller.rb` с действием `update`. 2) Использует `user.update_with_password(params)` — Devise-метод, требующий `current_password`, `password`, `password_confirmation`. 3) При успехе: `bypass_sign_in(user)` для сохранения сессии, редирект на профиль с flash. 4) При ошибке: редирект на профиль с ошибками. 5) Добавить маршрут `PATCH /users/profile/password`. |
| **Acceptance criteria** | 1) Верный текущий пароль + валидный новый → пароль обновлён, пользователь остаётся залогинен. 2) Неверный текущий пароль → ошибка `current_password`. 3) Новый пароль < 6 символов → ошибка валидации. 4) `password` и `password_confirmation` не совпадают → ошибка. 5) Пустой текущий пароль → ошибка. |
| **Затрагиваемые файлы** | `app/controllers/users/profile/passwords_controller.rb` (новый), `config/routes.rb` |

---

### Эпик B — Frontend (Inertia + React)

| | |
| :--- | :--- |
| **Фича B1** | Страница профиля (`profile/Show.tsx`) |
| **Ценность** | Единая точка управления учётными данными. |
| **Deliverables** | 1) Создать `app/frontend/pages/profile/Show.tsx`. 2) Обёртка `AuthLayout`. 3) Секция "Email": отображение текущего email, индикатор ожидающего подтверждения (`unconfirmed_email`), поле для нового email, кнопка "Сохранить email" с загрузкой. 4) Секция "Пароль": поля текущий пароль, новый пароль, подтверждение, кнопка "Сохранить пароль" с загрузкой. 5) Каждая секция — отдельная форма с `useForm`, отправляется на свой endpoint. 6) Ошибки валидации: красная рамка + текст под полем (паттерн Register). 7) Flash-уведомления через Toast. 8) Ссылка "Забыли пароль?" в секции пароля. 9) Кнопка "Назад" → Landing. 10) Все тексты из props `translations`. 11) При загрузке страницы — skeleton/spinner до получения данных. |
| **Acceptance criteria** | 1) Текущий email отображается. 2) `unconfirmed_email` отображается, если есть. 3) Форма email отправляет `PATCH /users/profile/email`. 4) Форма пароля отправляет `PATCH /users/profile/password`. 5) Ошибки валидации отображаются у соответствующих полей. 6) Кнопки блокируются при отправке (спиннер). 7) Flash-сообщения отображаются после успешного действия. 8) Нет захардкоженного текста — всё через i18n props. |
| **Затрагиваемые файлы** | `app/frontend/pages/profile/Show.tsx` (новый) |

---

| | |
| :--- | :--- |
| **Фича B2** | Навигация к профилю из Landing |
| **Ценность** | Пользователь находит настройки профиля без поиска по URL. |
| **Deliverables** | 1) Добавить ссылку "Профиль" (i18n ключ `auth.profile.link`) на страницу `Landing.tsx`. 2) URL передаётся из контроллера через props или Inertia route (не хардкодить путь в TSX). |
| **Acceptance criteria** | 1) Ссылка видна на Landing. 2) Клик ведёт на `/users/profile`. 3) Текст ссылки из i18n. |
| **Затрагиваемые файлы** | `app/frontend/pages/Landing.tsx`, контроллер Landing (если props нужны) |

---

### Эпик C — Локализация и документация

| | |
| :--- | :--- |
| **Фича C1** | Русская локализация профиля |
| **Ценность** | Единый язык интерфейса, согласованный с 001 и 002. |
| **Deliverables** | Все строки профиля в `config/locales/ru.yml` под ключами `auth.profile.*` (для Inertia props) и `devise.registrations.*` (для Devise, если применимо). Ключи: заголовок страницы, метки полей, кнопки, сообщения об успехе/ошибках, статус ожидающего подтверждения. |
| **Acceptance criteria** | На странице профиля нет «сырых» ключей перевода и нет текста вне файлов локализации. |
| **Затрагиваемые файлы** | `config/locales/ru.yml` |

---

| | |
| :--- | :--- |
| **Фича C2** | Документация фичи |
| **Ценность** | Воспроизводимость контекста, понимание реализации другими разработчиками и AI-агентами. |
| **Deliverables** | Документ `docs/features/user-profile.md` с описанием потоков (email change, password change), маршрутов, контроллеров, компонентов. |
| **Acceptance criteria** | Документ полный, актуальный, отражает реальную реализацию. |
| **Затрагиваемые файлы** | `docs/features/user-profile.md` (новый) |

---

### Эпик D — Качество

| | |
| :--- | :--- |
| **Фича D1** | Автотесты (RSpec request specs) |
| **Ценность** | Регрессии ловятся до продакшена. |
| **Deliverables** | 1) `spec/requests/users/profile_spec.rb` — отображение профиля (авторизованный/неавторизованный). 2) `spec/requests/users/profile/emails_spec.rb` — смена email (успешная, невалидный, занят, пустой, тот же). 3) `spec/requests/users/profile/passwords_spec.rb` — смена пароля (успешная, неверный текущий, короткий новый, несовпадение, пустой). Паттерн — как в `spec/requests/users/sessions_spec.rb` и `passwords_spec.rb`. Фабрика `:user` с трейтом `:confirmed` уже есть. |
| **Acceptance criteria** | 1) Все тесты зелёные. 2) Покрыты позитивные и негативные сценарии из раздела 6. 3) Проверяется постановка письма подтверждения в очередь при смене email. 4) Проверяется сохранение сессии после смены пароля. |
| **Затрагиваемые файлы** | `spec/requests/users/profile_spec.rb` (новый), `spec/requests/users/profile/emails_spec.rb` (новый), `spec/requests/users/profile/passwords_spec.rb` (новый) |

---

## 5. Инварианты (согласованно с 001 и 002)

1. Пароли только в виде хеша (BCrypt через Devise).
2. Один email — один аккаунт (unique constraint в БД).
3. Смена email не обходит подтверждение: новый адрес требует подтверждения, старый остаётся активным до подтверждения (`reconfirmable = true`).
4. Смена пароля требует текущий пароль (`update_with_password`).
5. Все операции профиля доступны только авторизованным пользователям (`before_action :authenticate_user!` в `ApplicationController`).

---

## 6. Сценарии ошибок и краевые случаи

### Смена email

| Ситуация | Ожидаемое поведение |
| :--- | :--- |
| Новый email валиден | `unconfirmed_email` обновлён, письмо подтверждения в очереди, flash "Письмо подтверждения отправлено". |
| Новый email невалидного формата | Ошибка валидации у поля, `unconfirmed_email` не изменён. |
| Новый email пуст | Ошибка валидации у поля. |
| Новый email совпадает с текущим | Ошибка валидации "совпадает с текущим", письмо не отправляется. |
| Новый email занят другим пользователем | Ошибка валидации (email уже используется). |
| Новый email совпадает с `unconfirmed_email` другого пользователя | Ошибка валидации (email уже используется) — уникальность проверяется по полю `email`, однако следует рассмотреть дополнительную проверку по `unconfirmed_email` во избежание конфликта при подтверждении. |
| Пользователь уже имеет `unconfirmed_email` и запрашивает новый | Старый `unconfirmed_email` перезаписывается новым, новое письмо подтверждения отправляется. |
| Неавторизованный запрос | Редирект на логин (`authenticate_user!`). |

### Смена пароля

| Ситуация | Ожидаемое поведение |
| :--- | :--- |
| Всё валидно | Пароль обновлён, сессия сохранена (`bypass_sign_in`), flash "Пароль успешно изменён". |
| Неверный текущий пароль | Ошибка `current_password: "неверный"`, пароль не изменён. |
| Пустой текущий пароль | Ошибка `current_password: "не может быть пустым"`. |
| Новый пароль < 6 символов | Ошибка валидации у поля `password`. |
| `password` и `password_confirmation` не совпадают | Ошибка у поля `password_confirmation`. |
| Новый пароль пуст | Ошибка валидации. |
| Неавторизованный запрос | Редирект на логин. |

---

## 7. Критерии приёмки (сводно)

1. Авторизованный пользователь видит страницу профиля с текущим email.
2. Пользователь может изменить email → получает письмо подтверждения на новый адрес; старый email остаётся активным до подтверждения.
3. Пользователь может изменить пароль, подтвердив текущий; после смены остаётся залогиненным.
4. На Landing есть ссылка на профиль.
5. UI визуально согласован с auth-страницами из 001/002 (`AuthLayout`, Tailwind); все тексты через i18n.
6. Письма подтверждения уходят через фоновую обработку (Sidekiq).
7. Интеграционные автотесты (RSpec) зелёные, покрывают позитивные и негативные сценарии.
8. Документация в `docs/features/user-profile.md`.
9. Пути и имена маршрутов сверены с актуальным `routes.rb`.
10. Работа не считается завершённой, пока не выполнены все требования настоящей спецификации.

---

## 8. Ограничения на реализацию

1. **Миграция БД:** НЕ НУЖНА — колонка `unconfirmed_email` уже есть. Если потребуются изменения схемы — согласовать с владельцем.
2. **Новые гемы:** НЕ нужны — всё реализуется средствами Devise + Inertia.
3. **Контроллеры:** только стандартные CRUD-паттерны; namespaced контроллеры (`Users::Profile::EmailsController`, `Users::Profile::PasswordsController`).
4. **UI:** Tailwind CSS, `AuthLayout`, `useForm` из Inertia; текст через i18n props.
5. **Маршруты:** `namespace :users` → `resource :profile, only: [:show]` + `namespace :profile` → `resource :email, only: [:update]`, `resource :password, only: [:update]`.
6. **Очередь:** письма подтверждения через `deliver_later` + Sidekiq (уже настроено).

---

## 9. Grounding: затрагиваемые файлы и модули

| Файл / модуль | Действие | Эпик |
| :--- | :--- | :--- |
| `config/initializers/devise.rb` | Изменить `reconfirmable` на `true` | A1 |
| `app/controllers/application_controller.rb` | Расширить `current_user` JSON полем `unconfirmed_email` | A1 |
| `app/controllers/users/profile_controller.rb` | Создать (show) | A2 |
| `app/controllers/users/profile/emails_controller.rb` | Создать (update) | A3 |
| `app/controllers/users/profile/passwords_controller.rb` | Создать (update) | A4 |
| `config/routes.rb` | Добавить маршруты профиля | A2–A4 |
| `app/frontend/pages/profile/Show.tsx` | Создать | B1 |
| `app/frontend/pages/Landing.tsx` | Добавить ссылку на профиль | B2 |
| `config/locales/ru.yml` | Добавить ключи `auth.profile.*` | C1 |
| `docs/features/user-profile.md` | Создать | C2 |
| `spec/requests/users/profile_spec.rb` | Создать | D1 |
| `spec/requests/users/profile/emails_spec.rb` | Создать | D1 |
| `spec/requests/users/profile/passwords_spec.rb` | Создать | D1 |
