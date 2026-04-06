# Implementation Plan: Единый хедер/меню для сайта

**Source spec:** `spec.md`  
**Feature:** `005-header-creation`  
**Grounded against current codebase:** `2026-04-06`

## 1. Текущее состояние кода

План ниже опирается на фактическое состояние репозитория, а не только на `spec.md`.

- Rails-приложение находится не в корне репозитория, а в `video_chat_and_translator/`.
- [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb) сейчас ведёт гостя с `/` на `users/sessions#new`, а авторизованного пользователя на `PagesController#index` через `authenticated_root`.
- [video_chat_and_translator/app/controllers/pages_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/pages_controller.rb) имеет только `index` и рендерит `Dashboard`; отдельного публичного landing-route и action для `/dashboard` пока нет.
- [video_chat_and_translator/app/frontend/pages/Landing.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Landing.tsx) уже существует, но сейчас не подключён маршрутом и содержит собственную навигацию и logout.
- [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx) и [video_chat_and_translator/app/frontend/pages/profile/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/profile/Show.tsx) содержат дубли навигации.
- [video_chat_and_translator/app/frontend/entrypoints/inertia.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/entrypoints/inertia.tsx) пока не оборачивает страницы общим layout.
- [video_chat_and_translator/app/frontend/components/Toast.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Toast.tsx) показывает только flash от сервера; для logout-error по сети/500 этого недостаточно.
- Request specs в [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb), [video_chat_and_translator/spec/requests/users/sessions_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/sessions_spec.rb), [video_chat_and_translator/spec/requests/users/profile_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/profile_spec.rb) проверяют старую карту маршрутов.
- В `video_chat_and_translator/package.json` сейчас нет Playwright-зависимостей и в приложении нет `playwright.config.*`, хотя `spec.md` требует `spec/e2e/header_spec.ts`.

## 2. Архитектурные решения и ограничения

- Изменений схемы БД не требуется. Миграции не нужны.
- Новые Ruby gems не требуются.
- Для сохранения инварианта `profile -> redirect to /users/sign_in`, но одновременно `guest /dashboard -> redirect to /`, нельзя ослаблять `ApplicationController#authenticate_user!` глобально. Редирект гостя с `/dashboard` нужно делать локально в `PagesController`.
- Чтобы хедер был на 100% Inertia-страниц, общий layout нужно подключать в [video_chat_and_translator/app/frontend/entrypoints/inertia.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/entrypoints/inertia.tsx), а не точечно на страницах.
- Текущий `AuthLayout` нужно сохранить как layout контента, а не как глобальный shell, иначе Devise-страницы останутся без Header.
- Для `C3 Logout Error Handling` понадобится клиентский способ показать toast без серверного flash. Практически это значит: либо расширить `Toast.tsx` управляемым состоянием, либо ввести рядом с ним минимальный локальный toast API. В рамках этой задачи лучше расширить существующий `Toast.tsx`, а не создавать второй механизм уведомлений.
- Для E2E есть два варианта: переиспользовать root-level tooling или добавить app-local Playwright setup. Так как `spec.md` жёстко называет файл `video_chat_and_translator/spec/e2e/header_spec.ts`, базовый план исходит из app-local setup в `video_chat_and_translator/`.

## 3. Область изменений

Планируемые файлы:

- Backend
  - [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb)
  - [video_chat_and_translator/app/controllers/pages_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/pages_controller.rb)
  - [video_chat_and_translator/app/controllers/users/sessions_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/users/sessions_controller.rb)
  - [video_chat_and_translator/app/controllers/users/registrations_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/users/registrations_controller.rb)
  - [video_chat_and_translator/app/controllers/concerns/redirect_authenticated_user.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/concerns/redirect_authenticated_user.rb) `new file`
- Frontend
  - [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx) `new file`
  - [video_chat_and_translator/app/frontend/components/Toast.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Toast.tsx)
  - [video_chat_and_translator/app/frontend/layouts/AppLayout.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/layouts/AppLayout.tsx) `new file`
  - [video_chat_and_translator/app/frontend/entrypoints/inertia.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/entrypoints/inertia.tsx)
  - [video_chat_and_translator/app/frontend/pages/Landing.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Landing.tsx)
  - [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx)
  - [video_chat_and_translator/app/frontend/pages/profile/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/profile/Show.tsx)
  - [video_chat_and_translator/app/frontend/pages/auth/AuthLayout.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/AuthLayout.tsx)
- Tests
  - [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb)
  - [video_chat_and_translator/spec/requests/users/sessions_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/sessions_spec.rb)
  - [video_chat_and_translator/spec/requests/users/profile_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/profile_spec.rb)
  - [video_chat_and_translator/spec/e2e/header_spec.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/e2e/header_spec.ts) `new file`
  - [video_chat_and_translator/playwright.config.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/playwright.config.ts) `new file`
  - [video_chat_and_translator/package.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package.json)
- Docs
  - [video_chat_and_translator/docs/components/header.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/components/header.md) `new file`
  - [video_chat_and_translator/docs/features/header-navigation.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/docs/features/header-navigation.md) `new file`

## 4. Последовательность работ

### Step 1. Привести backend route map к spec

**Зависимости:** нет. Это блокирующий шаг для всех последующих.

**Что сделать**

- Обновить [video_chat_and_translator/config/routes.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/config/routes.rb):
  - `/` -> `Pages::LandingController#show` для гостя и авторизованного;
  - `/dashboard` -> `Pages::DashboardController#show`;
  - сохранить `users/profile` как защищённый ресурс;
  - убрать старую схему `authenticated_root` / guest root на `sign_in`.
- Создать [video_chat_and_translator/app/controllers/pages/landing_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/pages/landing_controller.rb):
  - namespaced контроллер `Pages::LandingController`;
  - action `show` для рендера `Landing` component (публичный, без auth).
- Создать [video_chat_and_translator/app/controllers/pages/dashboard_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/pages/dashboard_controller.rb):
  - namespaced контроллер `Pages::DashboardController`;
  - action `show` для рендера `Dashboard` component;
  - `before_action :authenticate_user!` для защиты;
  - для гостя делать явный redirect на `/`.
- Вынести redirect авторизованного пользователя со страниц гостей в controller concern:
  - создать [video_chat_and_translator/app/controllers/concerns/redirect_authenticated_user.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/concerns/redirect_authenticated_user.rb);
  - подключить concern в [video_chat_and_translator/app/controllers/users/sessions_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/users/sessions_controller.rb) и [video_chat_and_translator/app/controllers/users/registrations_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/users/registrations_controller.rb) для `new`.
- Изменить logout-success redirect в [video_chat_and_translator/app/controllers/users/sessions_controller.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/controllers/users/sessions_controller.rb) с `/users/sign_in` на `/`.

**Почему так**

- Это минимально меняет поведение текущего Devise flow и не ломает защиту профиля.
- Concern соответствует локальному правилу проекта: предобработку контроллера держать в concern, а не раздувать контроллеры.

**Проверка шага**

- `GET /` отдаёт Inertia-страницу `Landing` и для гостя, и для авторизованного.
- `GET /dashboard` для авторизованного успешен, для гостя редиректит на `/`.
- `GET /users/sign_in` и `GET /users/sign_up` для авторизованного редиректят на `/dashboard`.
- `DELETE /users/sign_out` редиректит на `/`.

### Step 2. Подключить глобальный layout для всех Inertia-страниц

**Зависимости:** Step 1 завершён.

**Что сделать**

- Создать [video_chat_and_translator/app/frontend/layouts/AppLayout.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/layouts/AppLayout.tsx):
  - рендерит `<Header />`;
  - рендерит `<Toast />`;
  - рендерит `<main>{children}</main>`.
- Создать каркас [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx) без полной логики logout, но уже с `data-testid="header"` и layout-стилями из spec.
- Подключить `AppLayout` глобально в [video_chat_and_translator/app/frontend/entrypoints/inertia.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/entrypoints/inertia.tsx), чтобы он оборачивал все страницы, включая auth.
- Адаптировать [video_chat_and_translator/app/frontend/pages/auth/AuthLayout.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/AuthLayout.tsx), чтобы он отвечал только за центрирование карточки и не конфликтовал с глобальным `main`.
- **Удалить flash-блоки из auth-страниц** (чтобы избежать дублирования Toast):
  - [video_chat_and_translator/app/frontend/pages/auth/Login.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/Login.tsx):60 — удалить `<Toast />` и flash-блок;
  - [video_chat_and_translator/app/frontend/pages/auth/Register.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/Register.tsx):55 — удалить Toast и flash;
  - [video_chat_and_translator/app/frontend/pages/auth/ForgotPassword.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/ForgotPassword.tsx):52 — удалить Toast и flash;
  - [video_chat_and_translator/app/frontend/pages/auth/ResetPassword.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/auth/ResetPassword.tsx):57 — удалить Toast и flash;
  - [video_chat_and_translator/app/frontend/pages/profile/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/profile/Show.tsx):77 — удалить Toast и flash-блок.

**Почему так**

- Header должен оставаться смонтированным при SPA-навигации, значит место подключения должно быть выше всех страниц.
- `Toast` нужно централизовать, иначе landing будет иметь свой экземпляр, а остальные страницы другой.

**Проверка шага**

- Header видим на `/`, `/users/sign_in`, `/users/sign_up`, `/users/profile`, `/dashboard`.
- `Landing.tsx` больше не рендерит отдельный `Toast`.
- Devise-страницы визуально остаются в карточке и не ломают текущую вёрстку.
- Flash-уведомления удалены из Login, Register, ForgotPassword, ResetPassword, Profile (больше нет дублирования с Toast из AppLayout).

### Step 3. Реализовать menu logic и logout UX в Header

**Зависимости:** Step 2 завершён.

**Что сделать**

- Завершить [video_chat_and_translator/app/frontend/components/Header.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Header.tsx):
  - брать `current_user` и `url` через `usePage()`;
  - реализовать guest menu с `menu-signup`, `menu-signin`, `menu-home`;
  - скрывать guest `menu-home` на `/`;
  - реализовать auth menu с `menu-home-auth`, `menu-dashboard`, `menu-profile`, `menu-logout`;
  - active-state определять по текущему пути.
- Все navigation links в Header сделать через Inertia `<Link>`.
- Logout реализовать через `router.delete('/users/sign_out', callbacks)`:
  - на `onStart` -> кнопка disabled + текст `Выход...`;
  - на `onSuccess` -> Inertia обновляет shared props, Header переключается в guest-mode;
  - на `onError` / `onFinish` / network failure -> auth menu остаётся, кнопка возвращается в normal state, показывается toast.
- Расширить [video_chat_and_translator/app/frontend/components/Toast.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/components/Toast.tsx), чтобы он умел показывать не только `flash`, но и локально переданное сообщение ошибки из Header.

**Почему так**

- `C3` требует реакцию не только на успешный server redirect, но и на клиентские ошибки сети, которые flash не покрывает.
- Использование текущего `Toast.tsx` сохраняет один единый механизм уведомлений.

**Проверка шага**

- Гость видит корректное меню на `/users/sign_in`, `/users/sign_up`, `/users/password/new`.
- На `/` guest `menu-home` скрыт.
- Авторизованный на `/dashboard` видит активный `menu-dashboard`.
- Во время logout кнопка disabled и показывает `Выход...`.
- При ошибке logout toast видим, `menu-logout` снова активен, auth menu не пропадает.

### Step 4. Удалить дубли навигации со страниц

**Зависимости:** Step 3 завершён.

**Что сделать**

- Очистить [video_chat_and_translator/app/frontend/pages/Landing.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Landing.tsx):
  - удалить блок `{current_user && ...}`;
  - удалить локальный `handleSignOut`;
  - удалить локальный `Toast`.
- Очистить [video_chat_and_translator/app/frontend/pages/Dashboard.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/Dashboard.tsx):
  - удалить `Link` на профиль;
  - удалить кнопку `Sign Out`;
  - оставить только контент дашборда.
- Очистить [video_chat_and_translator/app/frontend/pages/profile/Show.tsx](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/app/frontend/pages/profile/Show.tsx):
  - удалить ссылку `back_to_home`;
  - при необходимости убрать больше неиспользуемый `Link` import.

**Почему так**

- После введения глобального Header локальная навигация станет противоречивой и будет нарушать DoD.

**Проверка шага**

- Grep по `app/frontend/pages/` больше не находит рабочие дубли навигации для `sign_in|sign_up|profile|dashboard`, кроме контента форм и переводов.
- Страницы не теряют основной функционал после удаления старых кнопок.

### Step 5. Обновить specs: request + E2E Header

**Зависимости:** Step 1 завершён. Steps 2-4 желательно завершить до финального прогонa.

**Что сделать (Request specs)**

- Переписать [video_chat_and_translator/spec/requests/pages_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/pages_spec.rb):
  - `GET /` для гостя -> `200` + `Landing`;
  - `GET /` для авторизованного -> `200` + `Landing`;
  - `GET /dashboard` для авторизованного -> `200` + `Dashboard`;
  - `GET /dashboard` для гостя -> redirect `/`.
- Дополнить [video_chat_and_translator/spec/requests/users/sessions_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/sessions_spec.rb):
  - `GET /users/sign_in` для авторизованного -> redirect `/dashboard`;
  - `DELETE /users/sign_out` -> redirect `/`.
- Дополнить [video_chat_and_translator/spec/requests/users/registrations_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/registrations_spec.rb) или добавить в существующий:
  - `GET /users/sign_up` для гостя -> `200` (форма регистрации);
  - `GET /users/sign_up` для авторизованного -> redirect `/dashboard`.
- Дополнить [video_chat_and_translator/spec/requests/users/profile_spec.rb](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/requests/users/profile_spec.rb):
  - оставить авторизованный `200`;
  - оставить guest redirect на `/users/sign_in`.

**Что сделать (E2E specs с Playwright)**

- Добавить минимальный app-local Playwright setup:
  - [video_chat_and_translator/playwright.config.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/playwright.config.ts) — конфиг Playwright (baseURL, chromium, timeout);
  - обновить [video_chat_and_translator/package.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package.json) — добавить `@playwright/test` в devDependencies;
  - обновить [video_chat_and_translator/package-lock.json](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/package-lock.json) — `npm install` после добавления зависимости;
  - добавить скрипт в `package.json`: `"test:e2e": "playwright test"`.
- Создать [video_chat_and_translator/spec/e2e/header_spec.ts](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/video_chat_and_translator/spec/e2e/header_spec.ts) со сценариями:
  - guest menu на `/users/sign_in` (проверить `menu-signup`, `menu-signin`, `menu-home` видимы);
  - скрытие `menu-home` на `/` (проверить display: none или отсутствие в DOM);
  - auth menu на `/dashboard` с active-state `menu-dashboard` (жирный или индиго);
  - logout успешный: `menu-logout` кликается, Header переключается на guest menu, редирект на `/`;
  - **logout с ошибкой 500** (stub DELETE /users/sign_out на ошибку): проверить toast видим, `menu-logout` вернулся в normal, auth menu остался.
- Использовать только `data-testid` для селекторов, не полагаться на текст или классы.

**Почему так**

- Request specs фиксируют route map и защищают от регрессий.
- E2E сценарий с ошибкой logout — обязательный по spec (Feature C3), не "при необходимости".

**Проверка шага**

- Request specs: `bundle exec rspec spec/requests/pages_spec.rb spec/requests/users/sessions_spec.rb spec/requests/users/registrations_spec.rb spec/requests/users/profile_spec.rb` проходят.
- E2E: `npx playwright test spec/e2e/header_spec.ts --base-url=http://localhost:$PORT` (где $PORT — реальный порт приложения) проходит стабильно (включая сценарий ошибки logout).

### Step 6. Настроить Docker и CI для E2E

**Зависимости:** Step 5 завершён.

**Что сделать (Docker и E2E)**

- **Локальное развитие (в Docker контейнере):**
  - Убедиться, что [docker/docker-compose.yml](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/docker/docker-compose.yml) имеет:
    - переменную окружения `PORT` (или определённый фиксированный порт для app сервиса, не 3000);
    - app запускается с `bundle exec rails s -b 0.0.0.0 -p $PORT` (слушает на всех интерфейсах).
  - Обновить [docker/Dockerfile](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/docker/Dockerfile) строку 16 и 28:
    - **Удалить** `npm install -g yarn` со строки 16 (yarn больше не используется, используем npm/package-lock.json);
    - **Заменить** строку 28 `RUN if [ -f package.json ]; then yarn install; fi` на `RUN npm ci` (установка зависимостей из package-lock.json, включая @playwright/test из Step 5).
  - Добавить новую строку после `RUN npm ci`:
    - `RUN npx playwright install --with-deps` (установка браузеров, зависит от локальной версии Playwright в контейнере).
  - Добавить в [docker/docker-compose.yml](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/docker/docker-compose.yml) опциональный сервис или способ запуска E2E внутри контейнера:
    - `docker compose -f docker/docker-compose.yml exec web npm run test:e2e -- --base-url=http://localhost:$PORT` (где $PORT — переменная из compose).

- **CI конфиг:**
  - Создать/обновить [.github/workflows/e2e.yml](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/.github/workflows/e2e.yml):
    - использовать `docker compose -f docker/docker-compose.yml up -d` для запуска приложения;
    - определить PORT (из env или из compose);
    - внутри контейнера app: `docker compose -f docker/docker-compose.yml exec -T web npm run test:e2e -- --base-url=http://web:$PORT` (используется внутренний Docker DNS `web`, а не localhost);
    - на ошибку — собрать артефакты (скриншоты, видео) и выложить в CI artifacts.
  - Убедиться, что `video_chat_and_translator/package-lock.json` committed в репо (для воспроизводимости версий Playwright).

**Почему так**

- Все разработка и тестирование происходит в Docker контейнерах (как требует проект CLAUDE.md:18).
- Заменяем yarn на npm ci для консистентности с package-lock.json (один источник версий).
- PORT не хардкодится, используется env переменная или определение из compose.
- E2E запускаются либо локально в контейнере, либо в CI через docker-compose.
- Избегаем зависимости от хост-машины разработчика.

**Проверка шага (Step 6)**

- Dockerfile изменён: строка 16 больше не имеет `npm install -g yarn`, строка 28 заменена на `RUN npm ci`, добавлена строка `RUN npx playwright install --with-deps`.
- Docker образ пересобирается (`docker compose -f docker/docker-compose.yml build`) без ошибок.
- Локально в Docker: `docker compose -f docker/docker-compose.yml exec web npm run test:e2e -- --base-url=http://localhost:$PORT` проходит стабильно.
- CI workflow запускает E2E через docker compose (с явным путём -f docker/docker-compose.yml) и выкладывает скриншоты на ошибку.

### Step 7. Документация и финальная верификация

**Зависимости:** Steps 1-6 завершены.

**Что сделать**

- Добавить [docs/components/header.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/docs/components/header.md):
  - props: `currentUser`, `usePage().url` для определения пути;
  - guest/auth states и логика переключения;
  - logout behavior: success, error handling, loading state;
  - Tailwind specs: `h-14 md:h-16`, `px-4 md:px-6 py-3`, цвета;
  - `data-testid` список для E2E.
- Добавить [docs/features/header-navigation.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/docs/features/header-navigation.md):
  - финальная route map (из spec.md таблица);
  - задействованные контроллеры/страницы;
  - ограничения и договорённости: redirect для авторизованных на sign_in/sign_up, protected маршруты;
  - flash-блоки удалены из auth-страниц (централизованный Toast в AppLayout).
- Финально прогнать в Docker контейнере (из корня репо):
  - TypeScript/eslint check: `docker compose -f docker/docker-compose.yml exec web npm run check`;
  - request specs: `docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/requests/pages_spec.rb spec/requests/users/sessions_spec.rb spec/requests/users/registrations_spec.rb spec/requests/users/profile_spec.rb`;
  - E2E spec в Docker: `docker compose -f docker/docker-compose.yml exec web npm run test:e2e -- --base-url=http://web:$PORT` (где $PORT — переменная из docker-compose.yml);
  - ручная smoke-test: залогиниться как гость → sign_up → sign_in → дашборд → профиль → logout, убедиться что Header работает на всех этапах без консольных ошибок.
- Обновить [.memory-bank/features/005-header-creation/definition_of_done.md](/Users/oleghasjanov/Documents/projects/video-chat-and-translator/.memory-bank/features/005-header-creation/definition_of_done.md) если требуется финальная галочка всех items.

**Проверка шага (Step 7)**

- Документация в `/docs/components/header.md` и `/docs/features/header-navigation.md` покрывает все новые компоненты и поведение.
- Все тесты и проверки проходят в docker-compose окружении (из корня репо с `-f docker/docker-compose.yml`):
  - `docker compose -f docker/docker-compose.yml exec web npm run check` — 0 ошибок;
  - `docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/requests/pages_spec.rb spec/requests/users/sessions_spec.rb spec/requests/users/registrations_spec.rb spec/requests/users/profile_spec.rb` — 100%;
  - `docker compose -f docker/docker-compose.yml exec web npm run test:e2e -- --base-url=http://web:$PORT` — 100% без flaky.
- Ручная smoke-test в браузере пройдена (все роуты работают, Header видимый везде).

## 5. Зависимости между шагами

```text
Step 1 (routes/controllers) ──┐
                               ├─> Step 2 (global layout)
                               │      │
                               │      └─> Step 3 (menu logic)
                               │            │
                               │            └─> Step 4 (cleanup)
                               │                  │
                               │                  └─> Step 5 (request specs + E2E impl)
                               │                       │
                               └────────────────────────┘
                                           │
                                           └─> Step 6 (Docker/CI setup)
                                                │
                                                └─> Step 7 (docs + final verification)
```

**Порядок выполнения:**
1. **Step 1** завершить полностью (routes, controllers).
2. **Steps 2-4** выполнять последовательно (layout -> menu -> cleanup).
3. **Step 5** запустить request specs после Step 4; E2E реализовать параллельно или после request specs.
4. **Step 6** выполнить после Step 5 (Docker/CI конфиг базируется на готовых specs).
5. **Step 7** выполнить после Step 6 (final verification запускает все tests).

## 6. Риски и контрольные точки

- **Риск:** глобальный `AppLayout` может сломать вертикальное центрирование auth-страниц.  
  **Контроль:** сразу после Step 2 визуально проверить `/users/sign_in`, `/users/sign_up`, `/users/password/new`.
- **Риск:** logout error state не поймается через существующий flash-only `Toast`.  
  **Контроль:** специально проверить `onError`/network-failure сценарий до написания E2E.
- **Риск:** изменение root routing может сломать существующие request specs и ожидания Devise.  
  **Контроль:** обновить request specs сразу после Step 1, не откладывать до конца.
- **Риск:** Playwright setup может потребовать отдельной CI-подготовки.  
  **Контроль:** при добавлении `playwright.config.ts` сразу выбрать способ старта Rails/Vite внутри docker-compose и зафиксировать его в docs.

## 7. Definition of Ready для начала реализации

Можно начинать реализацию без дополнительных согласований, если сохраняются условия:

- без миграций;
- без новых Ruby gems;
- без изменения бизнес-логики профиля и существующих auth flows, кроме redirect map из spec;
- E2E setup допускается как npm/dev dependency внутри `video_chat_and_translator/`.

Если в ходе реализации выяснится, что для E2E нужен иной инфраструктурный путь, это должно быть отдельным уточнением, но не блокирует Steps 1-5.
