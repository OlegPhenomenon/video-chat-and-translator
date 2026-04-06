# Definition of Done: Header Epic

Epic «Header/Navigation» считается **выполненным**, если выполнены ВСЕ пункты ниже.

## Deliverables
- [ ] Все Features (A–E) завершены и acceptance criteria пройдены
- [ ] Route Map (в spec.md) согласована и merged
- [ ] Header.tsx создан и merged
- [ ] AppLayout.tsx создан и merged
- [ ] Все дубли навигации удалены (Landing.tsx, Dashboard.tsx, profile/Show.tsx)
- [ ] Tests (request + E2E) merged и проходят в CI

## Code Quality
- [ ] TypeScript types полные (Header.tsx, AppLayout.tsx)
- [ ] Нет console.errors/warns при открытии любой страницы
- [ ] Tailwind классы соответствуют: `h-14 md:h-16`, `px-4 md:px-6 py-3`, `text-indigo-600`
- [ ] Нет dead code (удалены все закомментированные навигационные блоки)
- [ ] Код Header следует проектным conventions (см. CLAUDE.md)

## Documentation
- [ ] `/docs/components/Header.md` (или обновлена) с описанием:
  - Props (currentUser, currentPath/usePage)
  - Usage примеры
  - States (guest/auth)
  - Tailwind specs (размеры, цвета)
- [ ] Route Map в spec.md обновлена с финальным решением (Epic A результат)
- [ ] Commit messages ссылаются `Close #5`

## Testing
- [ ] Request specs: маршруты из Route Map покрыты (гость + авторизованный)
- [ ] E2E specs: Header меню, навигация, logout покрыты
- [ ] Tests проходят 100% в CI (нет skip/flaky)
- [ ] Smoke test: приложение работает как гость и авторизованный

## Performance
- [ ] Header не вызывает лишних re-renders (React DevTools Profiler)
- [ ] Нет N+1 queries из Header (если есть backend-логика)

## Browser/Responsive
- [ ] Header корректно на мобильном (<md), планшете, десктопе
- [ ] Меню не обрезается и не перекрывает контент на мобильном
- [ ] Текст читаемый, клики попадают (tap targets ≥48px)

## Acceptance Criteria Summary
- Все `[ ]` в Features A1–E2 отмечены как выполненные
- Все Invariants соблюдены (безопасность, Devise, Inertia, URL-ы)
