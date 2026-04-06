# TODO

## Tech Debt

- [ ] **Dashboard system specs** — написать `spec/system/dashboard_navigation_spec.rb` после одобрения Capybara + Cuprite (4 сценария задокументированы в `.memory-bank/features/005-dashboard-creation/plan.md`)
- [ ] **Dashboard Sign Out UX** — добавить визуальный фидбек при клике (смена текста / спиннер), не блокируя кнопку. Текущее поведение соответствует спеке, но даёт нулевой фидбек при медленном соединении
- [ ] **Frontend route helpers** — проверить наличие механизма передачи Rails-роутов на frontend (e.g. `js-routes`). Пути в `Dashboard.tsx` захардкожены строками (`/users/profile`, `/users/sign_out`)
