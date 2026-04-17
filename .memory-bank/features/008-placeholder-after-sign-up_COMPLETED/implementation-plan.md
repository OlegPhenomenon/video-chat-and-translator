---
title: "008-placeholder-after-sign-up: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации постоянного подтверждения после регистрации. Фиксирует grounding, шаги, риски и test strategy без переопределения spec.md."
derived_from:
  - spec.md
status: draft
audience: humans_and_agents
must_not_define:
  - feature_scope
  - feature_architecture
  - acceptance_criteria
  - blocker_state
---

# План имплементации

## Цель текущего плана

Довести `spec.md` по Issue #15 до исполнимого vertical slice: Rails controller передает одноразовый `registration_success`, React-страница `auth/Register` показывает постоянный success placeholder вместо формы, а request/component тесты доказывают контракт.

План основан на текущем `spec.md`, где deliverables пронумерованы как 1-6. Так как sibling `feature.md` отсутствует, а `spec.md` имеет `Status: draft`, этот `implementation-plan.md` остается в `status: draft` до upstream-решения о статусе спецификации.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `.memory-bank/index.md` | Корневой Memory Bank index | Обязательная точка входа по `AGENTS.md` | Использовать SSoT из `.memory-bank`, потому что `memory-bank/index.md` в рабочем дереве отсутствует |
| `.memory-bank/domain/architecture.md` | Канон Rails 8 + Inertia.js + React | Фича меняет backend/frontend bridge через Inertia props | Не добавлять API route; передавать состояние начальным prop'ом |
| `.memory-bank/domain/frontend.md` | Канон UI/i18n слоя | Фича меняет Inertia page и локализованные строки | Не хардкодить пользовательские строки в React |
| `.memory-bank/engineering/testing-policy.md` | Канон test surfaces | Фича меняет Rails request flow и React conditional render | RSpec для backend bridge, Vitest + RTL для React UI |
| `.memory-bank/flows/feature-flow.md` | Lifecycle и taxonomy планов | План должен содержать grounding, test strategy, `PRE-*`, `STEP-*`, `CHK-*`, `EVID-*` | Использовать plan IDs; не переопределять scope из `spec.md` |
| `PROJECT.md` | Product context | Подтверждает тонкий backend и client-heavy продуктовый контекст | Держать backend изменение минимальным |
| `video_chat_and_translator/app/controllers/users/registrations_controller.rb` | Сейчас `new` передает только `translations`; `create` success делает redirect с `notice`; error render передает `translations` и `errors` | Основная точка проп-контракта `registration_success` | Сохранить тонкий контроллер: только flash и props |
| `video_chat_and_translator/app/controllers/application_controller.rb` | `inertia_share flash: -> { flash.to_hash }` | Toast продолжит получать `flash.notice`; новый flash-key станет shared prop, но UI его не обязан использовать напрямую | Не менять `Toast.tsx` и shared flash механизм |
| `video_chat_and_translator/app/frontend/pages/auth/Register.tsx` | Сейчас всегда рендерит `<h1>` и форму; типы props не знают `registration_success` | Главная точка conditional render | Сохранить форму и error rendering без изменения поведения при `registration_success === false` |
| `video_chat_and_translator/app/frontend/pages/auth/AuthLayout.tsx` | Центрированная auth-card с `max-w-md`, `rounded-md`, `p-8` | Спека запрещает менять layout | Только вложенный success block внутри layout |
| `video_chat_and_translator/app/frontend/components/Toast.tsx` | Читает `flash.notice/alert` и скрывается через 5 секунд | Спека запрещает менять toast | Оставить без изменений; success placeholder независим от toast |
| `video_chat_and_translator/config/locales/ru.yml` | `auth.register` уже содержит form labels, `success`, `success_with_delay` | Новые тексты должны жить в i18n | Добавить 3 ключа под существующий `auth.register` |
| `video_chat_and_translator/spec/requests/users/registrations_spec.rb` | Уже покрывает GET sign_up, redirect success и invalid params count | Место для request specs prop-контракта | Расширить существующие contexts без нового spec surface |
| `video_chat_and_translator/spec/requests/videos_spec.rb` и `pages_spec.rb` | Request specs сейчас проверяют Inertia component через `response.body.include?` | Показывает текущий паттерн простых Inertia assertions | Для props добавить локальный helper/parsing в `registrations_spec.rb`, не глобальный support без необходимости |
| `video_chat_and_translator/package.json` | Есть только `check`; Vitest отсутствует | Deliverable 1 требует frontend test tooling | Добавить `"test": "vitest run"` и devDependencies |
| `video_chat_and_translator/package-lock.json` | Lockfile соответствует текущему `package.json` | `npm install --save-dev ...` изменит lockfile | Обновить вместе с `package.json` |
| `video_chat_and_translator/vite.config.ts` | Основной Vite config с React/Tailwind/Ruby plugins | Reference для alias/plugin choices | `vitest.config.ts` должен быть отдельным и минимальным |
| `video_chat_and_translator/tsconfig.app.json` | Алиасы `@/*` и `~/*` уже указывают на `app/frontend` | Vitest alias должен совпасть с TypeScript | В `vitest.config.ts` задать `@` на `app/frontend` |
| `.github/workflows/ci.yml` и `video_chat_and_translator/config/ci.rb` | Docker CI вызывает `bin/ci`; текущий `bin/ci` не запускает RSpec/npm tests | Важно для CI expectations | Local verify обязателен; CI coverage может потребовать отдельного follow-up, если проект решит включить новые suites в `bin/ci` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Registration request flow | `spec.md` Deliverables 2, 5; Acceptance criteria for redirect, props, notice, validation error; Prop contract table (spec.md:38-43) | `registrations_spec.rb` проверяет создание user, redirect, email enqueue, invalid count | **6 assertions закрывающих все render paths из spec.md prop contract:** (1) GET /users/sign_up без flash → `registration_success: false`; (2) valid POST /users → `follow_redirect!` → `registration_success: true`; (3) после redirect props содержат `translations.success_heading`, `translations.success_check_email`, `translations.success_login_link`; (4) `flash.notice == I18n.t("auth.register.success")`; (5) invalid POST /users → `registration_success: false` + `errors` присутствуют; (6) повторный GET /users/sign_up после success redirect → `registration_success: false` (flash consumed). Метод извлечения props: локальный helper `inertia_props` через Nokogiri (см. закрытый OQ-03) | `cd video_chat_and_translator && bundle exec rspec spec/requests/users/registrations_spec.rb` | Не требуется: CI не является required gate для данной фичи (см. закрытый OQ-02) | None for prop contract | `none` |
| Register component conditional render | `spec.md` Deliverables 4, 6; render contract acceptance criteria | Frontend component tests отсутствуют | Создать `spec/frontend/pages/auth/Register.test.tsx`: success hides form and renders message/link; non-success renders form and hides success message | `cd video_chat_and_translator && npm test` | Not required for Issue #15; local evidence only per closed OQ-02. CI expansion requires `AG-02` | Browser back/Inertia cache behavior не покрывается component unit test | `AG-01` for manual browser check |
| TypeScript/tooling | `spec.md` Deliverable 1; `engineering/testing-policy.md` local commands | `npm run check` уже запускает `tsc` для app/node configs; **NB:** `tsconfig.app.json` включает только `app/frontend`, `tsconfig.node.json` — только `vite.config.ts`; новые `vitest.config.ts` и `spec/frontend/` вне scope `npm run check` | `npm run check` проверяет только production TypeScript (component types в `app/frontend`). Валидность `vitest.config.ts` и test TSX доказывается через `npm test`: если Vitest запускается и тесты проходят, конфиг и transform корректны | `cd video_chat_and_translator && npm run check && npm test` | Не требуется (см. закрытый OQ-02) | None | `none` |
| Full Rails regression | Definition of Done: весь RSpec-набор без регрессий | Existing request/model specs | После targeted spec прогнать весь RSpec | `cd video_chat_and_translator && bundle exec rspec` | Not required for Issue #15; local evidence only per closed OQ-02. CI expansion requires `AG-02` | None | `none` |
| Manual UX confirmation | Definition of Done: signup -> redirect -> placeholder remains after toast disappears | Есть исторические screenshots, но не automated flow для этой фичи | Не добавлять Playwright/system tests, потому что `spec.md` explicitly excludes them | Manual: `bin/dev`, пройти `/users/sign_up`, дождаться исчезновения toast | Not required by current spec | Toast disappearance + persistent placeholder проверяются человеком, потому что Playwright/system tests вне scope | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Нужно ли перед исполнением переименовать/синхронизировать package под canonical `features/FT-XXX/feature.md` flow? | Текущий пакет живет в `.memory-bank/features/008-placeholder-after-sign-up/` и содержит `spec.md`, а не `feature.md`; это уже существующее состояние | Не блокирует кодовую реализацию; блокирует перевод плана в `status: active` по строгому gate | По умолчанию не переименовывать и не создавать `feature.md`; owner: human/project maintainer |
| ~~`OQ-02`~~ | ~~Должен ли `bin/ci` быть расширен запуском `bundle exec rspec`, `npm run check`, `npm test`?~~ | **Закрыт.** Текущий `config/ci.rb` запускает setup/rubocop/security checks, но не тестовые suites. `feature-flow.md:97` требует фиксации required local/CI suites. | Не блокирует реализацию. | **Решение (owner-approved exception):** CI **не** является required gate для данной фичи. Required evidence ограничено локальными командами: `bundle exec rspec`, `npm run check`, `npm test`. Изменение `bin/ci` и CI workflow выходит за scope Issue #15 и tracking'уется отдельно. При необходимости расширения CI → `AG-02` требует project maintainer approval. |
| ~~`OQ-03`~~ | ~~Как именно извлекать Inertia props в request spec: HTML `data-page` или JSON Inertia response?~~ | **Закрыт.** `inertia_rails.rb:7` устанавливает `use_script_element_for_initial_page = true`, поэтому Inertia initial page передается в `<script>` элементе, а не в `data-page` атрибуте корневого `<div>`. | Больше не блокирует `STEP-05`. | **Решение:** В `registrations_spec.rb` добавить локальный helper `inertia_props(response)`, который: (1) парсит `response.body` через `Nokogiri::HTML(response.body)`; (2) извлекает JSON из первого `<script>` элемента с `id="app"` или содержащего `"component":` substring; (3) возвращает `parsed["props"]` как Hash. **Failure mode:** если DOM structure Inertia меняется (upgrade `inertia_rails`), helper падает с `NoMethodError` / `JSON::ParserError` — это детектируемо и локализовано в одном spec файле. Не использовать `X-Inertia` JSON protocol, т.к. initial page GET не использует Inertia XHR headers. |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| working directory | Ruby/npm commands выполняются из `video_chat_and_translator/`; Memory Bank edits из repo root | `STEP-01`-`STEP-08` | `bundle`, `bin/rails`, `npm` не видят нужные files |
| package manager | Node deps обновляются через `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom` | `STEP-01` | `package-lock.json` не обновлен или `npm test` не находит Vitest |
| Ruby tests | Request specs запускаются через `bundle exec rspec` | `STEP-05`, `CHK-02`, `CHK-05` | Ошибки schema/db/env делают request evidence недостоверным |
| Frontend tests | Vitest запускается в `jsdom`; `@` alias указывает на `app/frontend` | `STEP-02`, `STEP-06`, `CHK-03` | `Cannot resolve @/...`, missing DOM APIs, failing JSX transform |
| Type checks | Existing command `npm run check` остается valid | `STEP-06`, `CHK-04` | TypeScript errors from updated `RegisterProps` or config |
| network | Network нужен только для `npm install`, если devDependencies еще не доступны локально | `STEP-01` | Registry/DNS failure; повторить с approved escalation if sandbox blocks |
| secrets/external services | Не требуются | all steps | Любой запрос внешних API/секретов означает выход за scope |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `spec.md` Invariants | `Toast.tsx`, `AuthLayout.tsx`, routes не изменяются | `STEP-03`, `STEP-04` | yes |
| `PRE-02` | `spec.md` Prop contract | `registration_success` обязателен во всех render paths `auth/Register` | `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06` | yes |
| `PRE-03` | `.memory-bank/domain/architecture.md` Backend / Frontend Bridge | Состояние страницы передается через Inertia props, не через новый API endpoint | `STEP-03`, `STEP-05` | yes |
| `PRE-04` | `.memory-bank/domain/frontend.md` Localization | Новые пользовательские строки идут через `config/locales` и props | `STEP-04` | yes |
| `PRE-05` | `.memory-bank/engineering/testing-policy.md` | Changed backend/frontend behavior имеет automated tests | `STEP-05`, `STEP-06`, `STEP-07` | yes |
| `PRE-06` | `OQ-01` | План может оставаться `draft`, пока upstream `spec.md` draft | all steps | no |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` Tooling | `spec.md` Deliverable 1 | Vitest tooling installed/configured; `npm test` available | agent | `PRE-05` |
| `WS-2` Backend prop contract | `spec.md` Deliverables 2, 5 | Controller success/error/new paths expose `registration_success` and request specs cover it | agent | `PRE-02`, `PRE-03` |
| `WS-3` UI/i18n | `spec.md` Deliverables 3, 4, 6 | Locale keys and `Register.tsx` conditional render implemented; component tests cover true/false states | agent | `WS-1`, `PRE-01`, `PRE-04` |
| `WS-4` Verification and acceptance | Definition of Done | Targeted and full checks run; manual UX gap documented | agent + human for manual UX | `WS-1`, `WS-2`, `WS-3`, `AG-01` for manual browser step |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Manual browser verification of signup UX, toast disappearance, and placeholder persistence | `STEP-08` | Requires interactive browser/mail confirmation flow; Playwright/system tests are explicitly out of scope in `spec.md` | Human tester note, screenshot, or PR comment |
| `AG-02` | Changing CI workflow or `bin/ci` to add RSpec/npm gates | `OQ-02` | Alters project-wide CI contract beyond this feature's file map | Project maintainer approval |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | Deliverable 1 | Add frontend test dependencies and npm test script | `video_chat_and_translator/package.json`, `video_chat_and_translator/package-lock.json` | `devDependencies` include `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`; script `"test": "vitest run"` | `CHK-01` | `EVID-01` | `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom`; inspect package files | `PRE-05` | none | Network install fails after approved retry |
| `STEP-02` | agent | Deliverable 1 | Add Vitest config grounded in existing aliases | `video_chat_and_translator/vitest.config.ts` | Config with `environment: "jsdom"` and alias `@` -> `app/frontend`; include React plugin if TSX transform needs it | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` | `npm test -- --runInBand` is not a Vitest option; use `npm test` only after tests exist | `STEP-01` | none | Vitest cannot transform TSX without additional config |
| `STEP-03` | agent | Deliverable 2 | Implement controller prop contract | `video_chat_and_translator/app/controllers/users/registrations_controller.rb` | `new` passes `registration_success: flash[:registration_success] || false`; success branch sets `flash[:registration_success] = true` before redirect while preserving `notice`; error branch passes `registration_success: false` | `CHK-02` | `EVID-02` | `bundle exec rspec spec/requests/users/registrations_spec.rb` after `STEP-05` | `PRE-01`, `PRE-02`, `PRE-03` | none | Existing validation errors stop rendering `auth/Register` |
| `STEP-04` | agent | Deliverables 3, 4 | Add localized success copy and conditional UI | `video_chat_and_translator/config/locales/ru.yml`, `video_chat_and_translator/app/frontend/pages/auth/Register.tsx` | `RegisterTranslations` and `RegisterProps` include success fields and `registration_success`; success state renders specified block/link instead of form; false state keeps current form | `CHK-03`, `CHK-04` | `EVID-03`, `EVID-04` | `npm run check`; `npm test` after `STEP-06` | `STEP-03`, `PRE-01`, `PRE-04` | none | UI requires changing `AuthLayout.tsx` or `Toast.tsx` |
| `STEP-05` | agent | Deliverable 5 | Extend request specs for full prop contract coverage | `video_chat_and_translator/spec/requests/users/registrations_spec.rb` | Добавить локальный helper `inertia_props(response)` (Nokogiri парсинг `<script>` элемента, см. закрытый OQ-03). **6 test cases:** (1) GET /users/sign_up без flash → `registration_success: false`; (2) valid POST → `follow_redirect!` → `registration_success: true`; (3) после redirect → props содержат `translations.success_heading`, `translations.success_check_email`, `translations.success_login_link`; (4) после redirect → `flash["notice"] == I18n.t("auth.register.success")`; (5) invalid POST → `registration_success: false` + `errors` hash присутствует; (6) повторный GET /users/sign_up (после success redirect, flash consumed) → `registration_success: false` | `CHK-02` | `EVID-02` | `bundle exec rspec spec/requests/users/registrations_spec.rb` | `STEP-03` | none | Nokogiri helper падает с `NoMethodError` или `JSON::ParserError` при изменении Inertia DOM structure; это локализованная ошибка в одном spec файле |
| `STEP-06` | agent | Deliverable 6 | Add component tests for success vs form state | `video_chat_and_translator/spec/frontend/pages/auth/Register.test.tsx` | Tests render `Register` with `registration_success: true/false`; mock `@inertiajs/react` `Head` and `useForm`; import `@testing-library/jest-dom/vitest` | `CHK-03` | `EVID-03` | `npm test` | `STEP-01`, `STEP-02`, `STEP-04` | none | Tests require changing production component solely for testability |
| `STEP-07` | agent | Definition of Done | Run local automated verification and simplify review | All changed files | Passing targeted suites, full RSpec, typecheck (production TS only), Vitest; no unnecessary abstractions. **NB:** `npm run check` проверяет только production TypeScript (`app/frontend`); валидность `vitest.config.ts` и test TSX доказывается через `npm test` | `CHK-02`, `CHK-03`, `CHK-04`, `CHK-05`, `CHK-06` | `EVID-02`-`EVID-06` | `bundle exec rspec spec/requests/users/registrations_spec.rb`; `bundle exec rspec`; `npm run check`; `npm test` | `STEP-05`, `STEP-06` | none | Full suite failure is unrelated and pre-existing; document exact failing specs |
| `STEP-08` | human / either | Definition of Done | Manual UX acceptance for persistent placeholder after toast disappears | Running local app, browser, confirmation email delivery surface if needed | Manual evidence that signup redirects to sign_up, toast disappears, placeholder remains | `CHK-07` | `EVID-07` | `bin/dev`, visit `/users/sign_up`, submit valid signup, wait >5s, verify form hidden and success block remains | `STEP-07` | `AG-01` | Manual flow requires external mail service not available locally |

## Parallelizable Work

- `PAR-01` `STEP-03` controller changes and `STEP-04` locale/UI typing can be developed in parallel after `STEP-01`, as long as both follow the same prop name `registration_success`.
- `PAR-02` `STEP-05` request specs can be drafted while `STEP-03` is in progress, but final assertions should wait until controller behavior exists.
- `PAR-03` `STEP-06` component tests can be written after `STEP-02` and `STEP-04`; they do not overlap with backend write surface.
- `PAR-04` Do not parallelize edits to `Register.tsx` and `Register.test.tsx` if one worker is actively changing the component API; test mocks depend on the final interface.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-02`, `CHK-01` | Frontend test tooling exists and `npm test` command resolves | `EVID-01` |
| `CP-02` | `STEP-03`, `STEP-05`, `CHK-02` | Request specs prove **all 4 render paths** из prop contract table (spec.md:38-43): (1) initial GET → false, (2) success redirect → true + 3 translation keys + flash.notice, (3) validation error → false + errors, (4) hard reload after consumed flash → false | `EVID-02` |
| `CP-03` | `STEP-04`, `STEP-06`, `CHK-03` | Component tests prove success placeholder replaces form only when `registration_success === true` | `EVID-03` |
| `CP-04` | `STEP-07`, `CHK-04`, `CHK-05`, `CHK-06` | Typecheck, Vitest, targeted RSpec, and full RSpec have known pass/fail evidence | `EVID-04`, `EVID-05`, `EVID-06` |
| `CP-05` | `STEP-08`, `CHK-07` | Manual signup UX confirms toast is temporary but placeholder persists | `EVID-07` |

## Checks

| Check ID | What it proves | Command / procedure | Required for |
| --- | --- | --- | --- |
| `CHK-01` | Vitest tooling is installed/configured | `cd video_chat_and_translator && npm test` after at least one test exists | `CP-01` |
| `CHK-02` | Backend Inertia prop contract works | `cd video_chat_and_translator && bundle exec rspec spec/requests/users/registrations_spec.rb` | `CP-02` |
| `CHK-03` | React conditional render works | `cd video_chat_and_translator && npm test` | `CP-03` |
| `CHK-04` | **Production** TypeScript remains valid (scope: `tsconfig.app.json` → `app/frontend`, `tsconfig.node.json` → `vite.config.ts`). `vitest.config.ts` и `spec/frontend/` не покрываются `npm run check`; их валидность доказывается через `CHK-03` (`npm test`) | `cd video_chat_and_translator && npm run check` | `CP-04` |
| `CHK-05` | Rails regression suite remains green | `cd video_chat_and_translator && bundle exec rspec` | `CP-04` |
| `CHK-06` | Simplify review passed | Inspect diff for unnecessary abstractions, unrelated refactors, forbidden file changes | `CP-04` |
| `CHK-07` | End-user UX matches Definition of Done | Manual browser signup and wait for toast timeout | `CP-05` |

## Evidence Contract

| Evidence ID | Carrier | Captured by |
| --- | --- | --- |
| `EVID-01` | `package.json`, `package-lock.json`, `vitest.config.ts`, `npm test` output | `STEP-01`, `STEP-02`, `CHK-01` |
| `EVID-02` | `registrations_controller.rb`, `registrations_spec.rb`, targeted RSpec output | `STEP-03`, `STEP-05`, `CHK-02` |
| `EVID-03` | `Register.tsx`, `Register.test.tsx`, Vitest output | `STEP-04`, `STEP-06`, `CHK-03` |
| `EVID-04` | `npm run check` output | `STEP-07`, `CHK-04` |
| `EVID-05` | Full `bundle exec rspec` output | `STEP-07`, `CHK-05` |
| `EVID-06` | Diff review note listing touched files and confirming no `Toast.tsx`, `AuthLayout.tsx`, route changes | `STEP-07`, `CHK-06` |
| `EVID-07` | Manual verification note/screenshot/PR comment | `STEP-08`, `CHK-07` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Inertia request specs cannot reliably parse props from script element | Backend contract tests become brittle | **Mitigation решена через закрытый OQ-03:** локальный helper `inertia_props(response)` использует Nokogiri для парсинга `<script>` элемента (grounding: `use_script_element_for_initial_page = true` в `inertia_rails.rb:7`). Failure mode: `NoMethodError` / `JSON::ParserError` при upgrade `inertia_rails` — локализовано в одном spec файле | Nokogiri не находит script element или JSON невалиден |
| `ER-02` | React Testing Library with React 19/Vite 8 needs config beyond minimal Vitest setup | `npm test` fails before assertions | Use `@vitejs/plugin-react` in `vitest.config.ts`; mock Inertia hooks instead of mounting full Inertia app | JSX transform or Inertia context errors |
| `ER-03` | Adding `registration_success` to all render paths is missed | Runtime prop is undefined and UI state ambiguous | Request specs cover success/error; initial GET can be covered by existing/new request assertion if needed | TypeScript or request spec shows missing prop |
| `ER-04` | `flash[:registration_success]` leaks into shared `flash` object | Extra shared data appears but should not affect UI | UI reads explicit page prop only; Toast ignores unknown flash keys | Component behavior depends on `flash.registration_success` |
| `ER-05` | CI does not run new tests | PR may pass CI without exercising new coverage | **Закрытый OQ-02 фиксирует:** CI не является required gate; required evidence — локальные `bundle exec rspec`, `npm run check`, `npm test`. Расширение CI tracking'уется отдельно с `AG-02` | Green CI with skipped RSpec/npm checks |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `PRE-01` | Implementation requires edits to `Toast.tsx`, `AuthLayout.tsx`, routes, or new controller | Stop and update `spec.md` or ask maintainer; do not expand scope silently | No production code changes beyond allowed files |
| `STOP-02` | `OQ-02`, `AG-02` | CI workflow must be changed to satisfy acceptance | Stop before editing CI; request maintainer approval | Feature code and local test evidence complete; CI change tracked separately |
| `STOP-03` | `ER-01` | Inertia props cannot be asserted deterministically in request specs | Stop and document exact failure; decide whether to add support helper or adjust spec | Controller implementation remains covered by lower-confidence assertions only if approved |
| `STOP-04` | `ER-02` | Vitest setup requires broad build/test architecture changes | Stop before introducing large test infra; escalate tooling decision | Backend implementation can remain isolated; component coverage blocked |
| `STOP-05` | `OQ-01` | Maintainer requires strict Memory Bank package shape before execution | Stop code work and migrate docs package first | Current `spec.md` and draft plan preserved |

## Готово для приемки

План можно считать исчерпанным, когда выполнены все условия:

- `STEP-01`-`STEP-07` завершены без unresolved blockers.
- `video_chat_and_translator/package.json`, `package-lock.json`, `vitest.config.ts`, controller, locale, `Register.tsx`, request spec и component spec отражают deliverables из `spec.md`.
- `CHK-02`, `CHK-03`, `CHK-04`, `CHK-05`, `CHK-06` имеют pass evidence или документированный pre-existing failure с точным выводом.
- `Toast.tsx`, `AuthLayout.tsx`, routes и validation-error поведение не изменены.
- `STEP-08` имеет human evidence по `AG-01`, либо manual gap явно принят owner'ом.
- `OQ-01` не скрыт: если owner требует strict Memory Bank lifecycle, решение оформлено отдельно до перевода плана в `status: active`.
- `OQ-02` закрыт: CI не является required gate; required evidence ограничено локальными suites. Расширение CI tracking'уется отдельно с `AG-02`.
- `OQ-03` закрыт: Inertia props извлекаются через Nokogiri-парсинг `<script>` элемента (grounding: `use_script_element_for_initial_page = true`).
