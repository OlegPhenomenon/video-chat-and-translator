# Spec: Постоянное подтверждение после регистрации

**Brief:** [brief.md](./brief.md)
**Issue:** [GitHub Issue #15](https://github.com/OlegPhenomenon/video-chat-and-translator/issues/15)
**Status:** draft
**Date:** 14.04.2026

---

## Контекст и grounding

- После успешной регистрации контроллер `Users::RegistrationsController#create` выполняет `redirect_to new_user_registration_path, notice: I18n.t("auth.register.success")`.
- Redirect (302) приводит к `GET /users/sign_up`, где метод `new` рендерит Inertia-компонент `auth/Register` с props `translations`.
- Flash notice передаётся через Inertia shared props (`flash.notice`) и отображается компонентом `Toast.tsx`, который исчезает через 5 секунд.
- После исчезновения toast на странице остаётся только пустая форма — нет постоянного подтверждения.
- Страница регистрации рендерится внутри `AuthLayout` (центрированная карточка `max-w-md`, `border`, `rounded-md`, `bg-white`, `p-8`, `shadow-sm`).
- Тексты хранятся в `config/locales/ru.yml` под ключом `auth.register`.

## Инварианты

- Поведение при ошибках валидации не меняется.
- `Toast.tsx` не изменяется.
- Контроллер остаётся тонким; логика отображения — на фронтенде.
- Тексты хранятся в файлах локализации.
- Новые маршруты не добавляются.
- `AuthLayout.tsx` не изменяется.

---

## Feature: Постоянное подтверждение после регистрации

Один vertical slice: backend передаёт состояние → фронтенд отображает → тесты подтверждают.

### Prop contract

`registration_success` — обязательный `boolean` во всех render paths компонента `auth/Register`:

| Render path | Значение | Источник |
|-------------|----------|----------|
| `create` success → redirect → `new` (GET) | `true` | `flash[:registration_success]` |
| `new` initial GET (без flash) | `false` | `flash[:registration_success] || false` |
| `create` validation error (direct render) | `false` | явно передаётся в props |
| `new` hard reload (flash consumed) | `false` | `flash[:registration_success] || false` |

- Контроллер `RegistrationsController#create` при успешном сохранении устанавливает `flash[:registration_success] = true` перед redirect.
- Контроллер `RegistrationsController#create` при ошибках валидации передаёт `registration_success: false` в direct render.
- Контроллер `RegistrationsController#new` передаёт в Inertia props: `registration_success: flash[:registration_success] || false`.
- Flash notice (`auth.register.success`) по-прежнему устанавливается для обратной совместимости с Toast.
- TypeScript interface `RegisterProps` расширяется: `registration_success: boolean`.

### Translation keys

Добавить в `config/locales/ru.yml` под `auth.register`:

```yaml
success_heading: "Регистрация прошла успешно"
success_check_email: "Для завершения регистрации проверьте вашу почту и подтвердите email по ссылке из письма."
success_login_link: "Перейти на страницу входа"
```

### Render contract (компонент `Register.tsx`)

При `registration_success === true` внутри `AuthLayout` рендерится блок подтверждения вместо формы:

- Heading: `<h1>` с текстом из `translations.success_heading`
- Body: `<p>` с текстом из `translations.success_check_email`
- Link: `<a href="/users/sign_in">` с текстом из `translations.success_login_link`
- Контейнер блока: `rounded-md`, `border`, `border-green-200`, `bg-green-50`, `p-6`
- Heading: `text-lg`, `font-semibold`, `text-green-800`
- Body: `text-sm`, `text-green-700`
- Link: `text-indigo-600`, `hover:underline`
- Форма (поля email, password, password_confirmation, кнопка submit, ссылки) не рендерится

При `registration_success === false` — текущее поведение: рендерится форма.

### State matrix

| Состояние | Форма | Success placeholder | Описание |
|-----------|-------|---------------------|----------|
| **Initial** (`GET /users/sign_up`, без flash) | Видима | Скрыт | Обычный заход на страницу регистрации |
| **Submitting** (`processing === true`) | Видима, submit `disabled` | Скрыт | Текущее поведение при отправке формы |
| **Validation error** (re-render с `errors`) | Видима, ошибки показаны | Скрыт | Текущее поведение при ошибках |
| **Success** (redirect → `GET` с `registration_success: true`) | Скрыта | Видим | Целевое состояние этой фичи |
| **Hard reload** (`GET /users/sign_up`, flash уже consumed) | Видима | Скрыт | Flash одноразовый; при reload возвращается обычная форма |
| **Back navigation** (browser back) | Видима | Скрыт | Inertia cache restore; prop `registration_success` не сохраняется между визитами |

---

### Deliverables

1. **Frontend test tooling setup** (`package.json`, `vitest.config.ts`):
   - Добавить devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
   - Добавить npm script: `"test": "vitest run"`
   - Создать `vitest.config.ts` с `environment: 'jsdom'` и алиасом `@` → `app/frontend`

2. **Controller** (`registrations_controller.rb`):
   - В `create` success branch: добавить `flash[:registration_success] = true` при успешном `resource.save`
   - В `create` error branch: добавить `registration_success: false` в props direct render `auth/Register`
   - В `new`: передать `registration_success: flash[:registration_success] || false` в Inertia props

3. **Localization** (`config/locales/ru.yml`):
   - Добавить ключи `auth.register.success_heading`, `auth.register.success_check_email`, `auth.register.success_login_link`

4. **Frontend** (`Register.tsx`):
   - Расширить `RegisterProps`: добавить `registration_success: boolean`
   - Расширить `RegisterTranslations`: добавить `success_heading`, `success_check_email`, `success_login_link`
   - При `registration_success === true` рендерить success placeholder вместо формы (по render contract выше)

5. **Request spec** (`registrations_spec.rb`):
   - Тест: `POST /users` с валидными params → `follow_redirect!` → Inertia props содержат `registration_success: true`
   - Тест: `POST /users` с невалидными params → Inertia props содержат `registration_success: false`

6. **Component test** (Vitest + React Testing Library, `Register.test.tsx`):
   - Тест: при `registration_success: true` → форма не в DOM, heading с `success_heading` в DOM, body с `success_check_email` в DOM, ссылка на `/users/sign_in` в DOM
   - Тест: при `registration_success: false` → форма в DOM, success placeholder не в DOM
   - Запуск: `npm test` (Vitest run)

---

### Acceptance criteria (end-to-end)

- [ ] `POST /users` с валидными params → redirect 302 → `GET /users/sign_up`
- [ ] После redirect Inertia props содержат `registration_success: true`
- [ ] После redirect Inertia props содержат `translations.success_heading`, `translations.success_check_email`, `translations.success_login_link`
- [ ] Flash `notice` по-прежнему содержит `I18n.t("auth.register.success")`
- [ ] `Register.tsx` при `registration_success: true`: форма (inputs, submit button) не рендерится
- [ ] `Register.tsx` при `registration_success: true`: рендерится heading с текстом `translations.success_heading`
- [ ] `Register.tsx` при `registration_success: true`: рендерится body с текстом `translations.success_check_email`
- [ ] `Register.tsx` при `registration_success: true`: рендерится ссылка на `/users/sign_in` с текстом `translations.success_login_link`
- [ ] `Register.tsx` при `registration_success: true`: контейнер сообщения имеет классы `rounded-md border border-green-200 bg-green-50 p-6`
- [ ] `Register.tsx` при `registration_success: false`: рендерится форма (текущее поведение)
- [ ] `Register.tsx` при ошибках валидации: рендерится форма с ошибками (текущее поведение)
- [ ] Hard reload `GET /users/sign_up` без flash: рендерится форма (flash одноразовый)
- [ ] Request spec: `POST` → `follow_redirect!` → prop `registration_success` равен `true`
- [ ] Request spec: `POST` с невалидными params → prop `registration_success` равен `false`
- [ ] Vitest: при `registration_success: true` form не в DOM, success message в DOM
- [ ] Vitest: при `registration_success: false` form в DOM, success message не в DOM
- [ ] Все существующие тесты в `registrations_spec.rb` проходят
- [ ] Весь RSpec-набор проходит без регрессий

---

## Итоговая карта затрагиваемых файлов

| Файл | Действие | Что меняется |
|------|----------|--------------|
| `video_chat_and_translator/package.json` | Изменить | devDependencies: vitest, @testing-library/react, @testing-library/jest-dom, jsdom; script "test" |
| `video_chat_and_translator/vitest.config.ts` | Создать | environment: jsdom, alias @ → app/frontend |
| `video_chat_and_translator/app/controllers/users/registrations_controller.rb` | Изменить | `create`: flash[:registration_success]; `new`: prop registration_success |
| `video_chat_and_translator/app/frontend/pages/auth/Register.tsx` | Изменить | Conditional render: form vs success placeholder |
| `video_chat_and_translator/config/locales/ru.yml` | Изменить | Добавить 3 ключа под `auth.register` |
| `video_chat_and_translator/spec/requests/users/registrations_spec.rb` | Изменить | Тесты на prop `registration_success` |
| `video_chat_and_translator/spec/frontend/pages/auth/Register.test.tsx` | Создать | Vitest: render с `registration_success: true/false` |

---

## Что НЕ входит в scope (Issue #15)

- Изменение `Toast.tsx` или механизма flash-уведомлений
- Изменение `AuthLayout.tsx`
- Добавление новых маршрутов или контроллеров
- Изменение поведения при ошибках валидации
- Кнопка «Повторно отправить письмо» на странице регистрации
- Редизайн страницы регистрации за пределами блока success placeholder
- Playwright/system tests

## Definition of Done (Issue #15)

- [ ] `npm test` проходит (Vitest): conditional render работает
- [ ] Request specs проходят: prop `registration_success` передаётся корректно
- [ ] Весь RSpec-набор проходит без регрессий
- [ ] Ручная проверка: signup → redirect → success placeholder видим, toast исчезает через 5 сек, placeholder остаётся
