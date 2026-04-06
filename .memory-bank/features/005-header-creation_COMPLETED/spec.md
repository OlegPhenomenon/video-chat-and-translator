# Tech Spec: Единый хедер/меню для сайта

**Source:** `brief.md` (06.04.2026) | **Status:** ready for implementation  
**See also:** `definition_of_done.md` (DoD checklist), `brief.md` (требования)

---

## Порядок выполнения

```
Epic A (Route Map) → COMPLETE BEFORE B/C
  ├─ Epic B (Header Component) ┐
  └─ Epic C (Menu Logic) ──────┤→ PARALLEL
                                ├─ Epic D (Cleanup)
                                └─ Epic E (Tests)
```

---

## Route Map (финальная)

| Path | Гость | Авторизованный | Controller | Comment |
|------|---|---|---|---|
| `/` | Landing | Landing | `PagesController#home` | Публичная главная для всех |
| `/dashboard` | Редирект `/` | Dashboard | `PagesController#dashboard` | Новый маршрут |
| `/users/sign_in` | Devise форма | Редирект `/dashboard` | Devise | **CHANGE** |
| `/users/sign_up` | Devise форма | Редирект `/dashboard` | Devise | **CHANGE** |
| `/users/profile` | Редирект `/users/sign_in` | Profile | `Users::ProfileController#show` | Новый namespace контроллер |
| `/users/sign_out` | N/A | DELETE → `/` | Devise | Существует |

---

## Epic A — Route Map (Feature A1)

**Deliverables:** финальная Route Map (выше) + решение по `/dashboard` и редиректам

**AC:** таблица согласована с Product Owner; определены редиректы на 422/500 при logout

---

## Epic B — Header Component (Features B1–B2)

### B1 — Header.tsx

**Deliverables:** React компонент Header с Tailwind стилями

**AC:**
- [ ] `data-testid="header"` на корневом элементе
- [ ] Высота: `h-14 md:h-16`; паддинги: `px-4 md:px-6 py-3`
- [ ] Props: `currentUser` (bool/object), наследует `usePage().url` из Inertia
- [ ] Цвета: `bg-white` (фон), `text-gray-900` (текст), `text-indigo-600` (active)
- [ ] На мобильном читаемо и не обрезано

**Grounding:** `app/frontend/components/Header.tsx`, Tailwind

---

### B2 — AppLayout.tsx

**Deliverables:** Layout компонент, оборачивает все Inertia страницы

**AC:**
- [ ] Рендерит `<Header>` + `<main>{children}</main>`
- [ ] Подключен глобально в `entrypoints/inertia.tsx`
- [ ] Header видимый на 100% страниц (публичные, Devise, защищённые)

**Grounding:** `app/frontend/entrypoints/inertia.tsx`

---

## Epic C — Menu Logic (Features C1–C4)

### C1 — Guest Menu

**Deliverables:** меню для неавторизованного пользователя

**AC:**
- [ ] Три пункта: `Зарегистрироваться` → `/users/sign_up`, `Авторизоваться` → `/users/sign_in`, `Главная` → `/`
- [ ] `data-testid="menu-signup"`, `"menu-signin"`, `"menu-home"`
- [ ] Пункт `menu-home` скрыт (display: none) когда `usePage().url === '/'`
- [ ] Пункт `menu-home` видимый на Devise-страницах (`/users/sign_in`, `/users/sign_up`, `/users/password/new`, `/users/confirmation/new`) и всех остальных кроме `/`

**Grounding:** Header.tsx, Routes

---

### C2 — Auth Menu

**Deliverables:** меню для авторизованного пользователя

**AC:**
- [ ] Четыре пункта: `Главная` → `/`, `Дашборд` → `/dashboard`, `Профиль` → `/users/profile`, `Выйти` (кнопка)
- [ ] `data-testid="menu-home-auth"`, `"menu-dashboard"`, `"menu-profile"`, `"menu-logout"`
- [ ] Active-state (жирнее или `text-indigo-600`) совпадает с текущим путём

**Grounding:** Header.tsx, Route Map

---

### C3 — Logout Error Handling

**Deliverables:** обработка ошибок при logout

**Behavior:**
- **Success (2xx):** Header переключается на гостевое меню, редирект на `/`
- **Error (422/500/network):** Toast с ошибкой; меню остаётся авторизованным; кнопка `menu-logout` возвращается в normal (не disabled); пользователь может повторить

**AC:**
- [ ] При успехе Header показывает гостевое меню (проверяется через `data-testid`)
- [ ] При ошибке: Toast видимый, меню остаётся auth, кнопка не disabled
- [ ] Во время запроса: кнопка `disabled`, текст "Выход..."

**Grounding:** Header.tsx, Toast.tsx

---

### C4 — SPA Navigation (Inertia Links)

**AC:**
- [ ] Все ссылки в меню реализованы через Inertia `<Link>` (кроме logout → `router.delete`)
- [ ] При клике на ссылку URL в браузере меняется без hard page reload (перезагрузка страницы не происходит)
- [ ] Header остаётся смонтирован и видимым во время навигации (не размонтируется)
- [ ] Содержимое страницы обновляется, Header остаётся на месте

**Grounding:** @inertiajs/react, Inertia dokumentatsiya

---

## Epic D — Cleanup (Features D1–D2)

**Deliverables:** удалены дубли навигации

**AC:**
- [ ] `Dashboard.tsx`: нет кнопки "Выйти", нет ссылки "Профиль"
- [ ] `Landing.tsx`: удален блок `{current_user && ...}` с профилем/выходом (строки ~47-64)
- [ ] `profile/Show.tsx`: нет ссылки "Назад на главную"
- [ ] Grep `"sign_in\|sign_up\|profile\|dashboard"` в `app/frontend/pages/` возвращает только комментарии или disabled код

**Grounding:** Landing.tsx, Dashboard.tsx, profile/Show.tsx

---

## Epic E — Testing

### E1 — Request Specs

**Scenarios:**
- GET `/` для гостя/авторизованного (200)
- GET `/users/sign_in`/`/users/sign_up` для авторизованного → редирект `/dashboard` (302)
- GET `/dashboard` для авторизованного (200); для гостя → редирект
- GET `/users/profile` для авторизованного (200); для гостя → редирект `/users/sign_in`
- DELETE `/users/sign_out` для авторизованного (302 на `/`)

**AC:**
- [ ] Все сценарии покрыты (гость + авторизованный)
- [ ] Тесты проходят в CI и локально
- [ ] Файлы: `spec/requests/pages_spec.rb`, `spec/requests/users/sessions_spec.rb`, `spec/requests/users/profile_spec.rb`

**Grounding:** RSpec, Route Map

---

### E2 — E2E Header UI (Playwright)

**Scenarios:**
- Гостевое меню: откройте `/users/sign_in`, проверьте `menu-signup`, `menu-signin`, `menu-home` видимы
- На `/`: `menu-home` скрыт (display: none или отсутствует в DOM)
- Auth меню: залогинитесь, откройте `/dashboard`, проверьте `menu-dashboard` активный (жирный или индиго)
- Logout: кликните `menu-logout`, Header переключается на гостевое меню за <2сек

**AC:**
- [ ] Все сценарии автоматизированы в Playwright тестах (TypeScript)
- [ ] Тесты используют `data-testid` для поиска элементов (не текст, не классы)
- [ ] Тесты проходят локально и в CI без flaky-issues
- [ ] Файл: `spec/e2e/header_spec.ts`

**Grounding:** Playwright, `spec/e2e/header_spec.ts`

---

## Out of Scope

- i18n/локализация (пока русский)
- Редизайн существующих страниц
- Новые сущности/роли
- PWA/offline
- Analytics/tracking
- Full a11y audit (базовый contrast + keyboard nav требуется)

---

## Invariants

Должны оставаться верны:
1. Все защищённые маршруты остаются защищёнными
2. Devise функционал (login/logout) не ломается
3. Inertia SPA навигация работает корректно
4. Существующие страницы работают после удаления навигации
5. Тесты проходят в CI
6. URL-ы: `/` → главная, `/users/sign_in`/`sign_up` → Devise, `/users/profile` → профиль
7. Header на 100% страниц, меню переключается корректно
