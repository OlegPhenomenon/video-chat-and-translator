# Spec: Создание страницы дашборда

**Brief:** [brief.md](./brief.md)
**Status:** draft
**Date:** 06.04.2026

---

## Эпики и фичи (Vertical Slices)

### Epic 1: Authenticated Root → Dashboard

Цель: авторизованный пользователь попадает на страницу дашборда, а не на маркетинговую заглушку.

---

#### Feature 1.1: Переключить PagesController#index на рендер Dashboard

**Ценность:** Авторизованный пользователь видит рабочее пространство, а не маркетинговую страницу.

**Deliverables:**
- `PagesController#index` рендерит Inertia-компонент `"Dashboard"` вместо `"Landing"`
- Маршрут `authenticated_root` (`pages#index`) остаётся без изменений

**Acceptance criteria:**
- [ ] GET `/` для авторизованного пользователя возвращает Inertia-компонент с именем `"Dashboard"`
- [ ] GET `/` для неавторизованного пользователя по-прежнему редиректит на страницу входа (`users/sessions#new`)
- [ ] Landing.tsx остаётся в проекте (не удаляется) — маркетинговая страница может понадобиться позже

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/controllers/pages_controller.rb` — изменить `render inertia: "Landing"` → `render inertia: "Dashboard"`

---

### Epic 2: Dashboard UI Foundation

Цель: создать минимальный React-компонент страницы дашборда с заголовком и навигацией.

---

#### Feature 2.1: Компонент Dashboard с заголовком

**Ценность:** Пользователь сразу понимает, что находится в рабочем пространстве приложения, а не на рекламной странице.

**Deliverables:**
- Новый файл `app/frontend/pages/Dashboard.tsx`
- Страница отображает заголовок «Dashboard»
- Компонент структурирован как функциональный React-компонент с явным `<main>` wrapper

**Acceptance criteria:**
- [ ] На странице присутствует элемент с текстом "Dashboard" (heading)
- [ ] GET `/` для авторизованного пользователя возвращает Inertia-ответ с компонентом Dashboard (проверяется в Feature 1.1)

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/pages/Dashboard.tsx` — NEW

---

#### Feature 2.2: Навигация: ссылка на профиль и кнопка выхода

**Ценность:** Пользователь может перейти к управлению профилем или выйти из системы прямо с дашборда.

**Deliverables:**
- Навигационная панель/хедер внутри `Dashboard.tsx` ровно с двумя элементами:
  1. Ссылка на `/users/profile` (Inertia `<Link>`)
  2. Кнопка Sign Out (Devise: `DELETE /users/sign_out`)

**Acceptance criteria:**
- [ ] На странице присутствует Inertia `<Link>` элемент, ведущий на `/users/profile`
- [ ] На странице присутствует кнопка (форма с методом DELETE) для выхода из системы через `/users/sign_out`
- [ ] После нажатия Sign Out пользователь редиректится на страницу входа
- [ ] Навигация содержит ровно два элемента (не больше, не меньше) — соответствует брифу
- [ ] При недоступности сервера кнопка Sign Out остаётся видимой и активной (не скрывается, не показывает вечный спиннер)

**Grounding (затрагиваемые файлы):**
- `video_chat_and_translator/app/frontend/pages/Dashboard.tsx` — добавить nav в компонент
- `video_chat_and_translator/config/routes.rb` — только чтение (маршрут `/users/sign_out` уже определён через `devise_for`)

---

## Итоговая карта затрагиваемых файлов

| Файл | Действие | Фича |
|------|----------|-------|
| `app/controllers/pages_controller.rb` | Изменить (Landing → Dashboard) | 1.1 |
| `app/frontend/pages/Dashboard.tsx` | Создать | 2.1, 2.2 |
| `app/frontend/pages/Landing.tsx` | Не трогать | — |
| `config/routes.rb` | Только чтение (маршруты не меняются) | — |

---

## Инварианты (то, что НЕ меняется)

- `Landing.tsx` компонент остаётся в проекте и не удаляется — маркетинговая страница может понадобиться позже
- Маршруты не меняются: `authenticated_root` (`pages#index`) остаётся без изменений
- Маршрут `/users/sign_out` (Devise) остаётся функциональным и без изменений

---

## Что НЕ входит в скоп

- Статистика, счётчики, история сессий — следующие фичи
- Новый layout-компонент (используется inline структура, пока нет общего authenticated layout)
- Изменение маршрутов (authenticated root уже настроен)

## Тестирование (требуется по CLAUDE.md)

- **Feature 1.1:** Request spec (`spec/requests/pages_spec.rb`) 
  - GET `/` для авторизованного пользователя возвращает компонент Dashboard
  - GET `/` для неавторизованного редиректит на login
  - Landing.tsx остаётся в коде (не удаляется)
  
- **Feature 2.2:** System/feature spec с JavaScript (`spec/system/dashboard_navigation_spec.rb`)
  - Навигация отображает две ссылки (Profile и Sign Out)
  - Sign Out форма работает (DELETE запрос)
  - Редирект на login после Sign Out
  - AC про недоступность сервера: Sign Out остаётся видимым/активным
