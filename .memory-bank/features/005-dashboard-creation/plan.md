# Implementation Plan: 005 Dashboard Creation

**Source spec:** `./spec.md`  
**Prepared:** 06.04.2026  
**Revised after reviewer feedback:** 06.04.2026

## Summary of Reviewer Feedback Fixes

This plan addresses all 5 reviewer comments:

1. **Step 5 (Docker completeness):** Expanded with full Dockerfile/docker-compose.yml analysis, Cuprite stack choice, exact OS packages needed, and headless browser config (Sections 5.1–5.4)

2. **Steps 5, 7 & Definition of Done (Authentication):** Added specific Devise integration helpers for system specs, Warden fallback, and spec/rails_helper.rb requirements (Section 5.2, 6.1)

3. **Steps 3 & 6 (Server unavailability AC):** Added Step 3.1 with INCORRECT vs CORRECT sign-out button patterns, and Step 6.2 Scenario 4 with concrete test assertions for button resilience (Sections 3.1, 6.2)

4. **Step 7 (Frontend validation):** Added Step 7 for TypeScript checking, `npm run check` in verification plan, and DoD requirement for frontend compilation validation (Sections 6, 7)

5. **Definition of Done completeness:** Split into "Always required" vs "Only if approved" checklists with explicit system spec scenario list, including Scenario 4 (Section 7)

## 1. Grounding Against Current Code

### Current state

- `video_chat_and_translator/config/routes.rb`
  - `authenticate :user do ... root "pages#index", as: :authenticated_root end`
  - guest root stays `users/sessions#new`
  - `/users/profile` already exists via `resource :profile`
  - Devise already exposes `DELETE /users/sign_out`
- `video_chat_and_translator/app/controllers/application_controller.rb`
  - `before_action :authenticate_user!` already protects `PagesController#index`
  - Inertia shared props already expose `current_user` and `flash`
- `video_chat_and_translator/app/controllers/pages_controller.rb`
  - `index` currently renders `Landing`
- `video_chat_and_translator/app/frontend/pages/Landing.tsx`
  - already contains a profile link and sign-out trigger for authenticated users
  - must remain in the repo untouched as a preserved marketing page
- `video_chat_and_translator/spec/requests/pages_spec.rb`
  - currently checks only redirect for guests and success for authenticated users
- `video_chat_and_translator/spec/requests/users/sessions_spec.rb`
  - already verifies `DELETE /users/sign_out` redirects to login

### Architecture fit

- No route change is needed.
- No schema change is needed.
- No service object or concern is needed: the change is a simple controller render swap plus a new Inertia page.
- Controller shape stays compliant with the project rule: `PagesController` keeps standard CRUD-style `index`.

### Real constraint discovered during grounding

The spec asks for `spec/system/dashboard_navigation_spec.rb`, but the current repo does **not** have system-spec/browser infrastructure:

- no `spec/system` directory
- no Capybara/system config in `spec/rails_helper.rb`
- no browser-testing gems/config visible in `video_chat_and_translator/Gemfile`

Because project rules require asking permission before installing new gems, browser-level system coverage is a **blocked dependency** until that permission is granted.

## 2. Files To Touch

### Required for core feature

- `video_chat_and_translator/app/controllers/pages_controller.rb`
- `video_chat_and_translator/app/frontend/pages/Dashboard.tsx` (new)
- `video_chat_and_translator/spec/requests/pages_spec.rb`
- `video_chat_and_translator/docs/features/dashboard.md` (new)

### Required only if system-test tooling is approved

- `video_chat_and_translator/Gemfile` — browser/system test gems (e.g., Capybara + Cuprite)
- `video_chat_and_translator/spec/rails_helper.rb` — RSpec system-spec config, Capybara driver setup
- `video_chat_and_translator/spec/support/capybara.rb` (new) — headless browser config and auth helpers
- `video_chat_and_translator/Dockerfile` — verify/add OS dependencies for Cuprite (chromium libs)
- `docker/docker-compose.yml` — verify web service has correct build context
- `video_chat_and_translator/spec/system/dashboard_navigation_spec.rb` (new)

### Explicitly not touched

- `video_chat_and_translator/config/routes.rb`
- `video_chat_and_translator/db/schema.rb`
- `video_chat_and_translator/app/frontend/pages/Landing.tsx`

## 3. Atomic Implementation Steps

| Step | Goal | Depends on | Files | Checkpoint |
|------|------|------------|-------|------------|
| 1 | Lock request-level expectations for root behavior before implementation | none | `spec/requests/pages_spec.rb` | Failing/pending examples define target behavior for authenticated root, guest redirect, and preserved `Landing.tsx` presence |
| 2 | Switch authenticated root from `Landing` to `Dashboard` | 1 | `app/controllers/pages_controller.rb` | `GET /` for signed-in user renders `Dashboard`; guest behavior unchanged |
| 3 | Create minimal dashboard page with heading and exactly two nav actions | 2 | `app/frontend/pages/Dashboard.tsx` | Page shows `Dashboard`, profile link, sign-out control, and a semantic `<main>` wrapper |
| 4 | Document the new public page and root behavior | 2, 3 | `docs/features/dashboard.md` | Repo docs describe route behavior, files, and sign-out/profile navigation |
| 5 | Establish browser/system test harness (decision gate + Docker verification) | 1 | `Gemfile`, `Dockerfile`, `docker/docker-compose.yml`, `spec/rails_helper.rb`, `spec/support/capybara.rb` | Docker image supports headless Chromium; `type: :system` specs can run; Devise integration helpers configured |
| 6 | Add browser-level regression for navigation and sign-out flow | 3, 5 | `spec/system/dashboard_navigation_spec.rb` | All 4 scenarios pass: dashboard display, profile link, sign-out flow, **sign-out resilience on server error** |
| 7 | Validate frontend TypeScript compilation and imports | 3 | Dashboard.tsx via `npm run check` | No TS errors; Dashboard imports are correct; page type-safe |
| 8 | Run full verification in Docker and validate all layers | 1-7 | none (all previously modified files) | Request specs + system specs + frontend validation all pass; Definition of Done checklist complete |

## 4. Step-by-Step Detail

### Step 1. Expand `pages` request spec first

**Why first:** this locks the server-side contract before UI work.

Planned changes in `video_chat_and_translator/spec/requests/pages_spec.rb`:

- replace the weak `"returns success"` example with a concrete assertion that the response body includes `"Dashboard"` as the rendered Inertia component name
- keep the guest redirect assertion to `new_user_session_path`
- add a small regression assertion that `Rails.root.join("app/frontend/pages/Landing.tsx")` still exists, because the spec explicitly says the file must remain

Notes:

- This matches the existing test style already used in `spec/requests/users/profile_spec.rb`, where component presence is asserted via `response.body`
- No route or DB work is required

### Step 2. Update `PagesController#index`

Planned changes in `video_chat_and_translator/app/controllers/pages_controller.rb`:

- change `render inertia: "Landing"` to `render inertia: "Dashboard"`
- remove `app_name` prop if the new page does not need it

Expected result:

- authenticated root still points to `pages#index`
- unauthenticated access still redirects before the action because `ApplicationController` already enforces `authenticate_user!`

### Step 3. Add the new `Dashboard` page

Create `video_chat_and_translator/app/frontend/pages/Dashboard.tsx`.

Implementation target:

- functional React component
- explicit `<main>` wrapper
- heading text `Dashboard`
- one navigation container with exactly two actions:
  - profile link to `/users/profile`
  - sign-out button targeting `/users/sign_out` with `DELETE`

#### 3.1 Sign-Out Button Design (Acceptance Criteria compliance)

Per spec.md line 73 and Step 6 Scenario 4, the sign-out button must remain **visible and active** even if the server is unreachable or the request fails.

**INCORRECT approach (violates AC):**
```tsx
const [processing, setProcessing] = useState(false);

return (
  <button 
    disabled={processing}  // ❌ Button becomes disabled during request
    onClick={() => {
      setProcessing(true);  // ❌ Button stays disabled if request fails
      router.delete('/users/sign_out');
    }}
  >
    {processing ? '...' : 'Sign Out'}  // ❌ Spinner can persist
  </button>
);
```

**CORRECT approach:**
```tsx
const handleSignOut = () => {
  router.delete('/users/sign_out');
  // Button remains enabled/visible regardless of request outcome
  // No disabled state, no spinner tied to success
};

return (
  <button onClick={handleSignOut}>
    Sign Out
  </button>
);
```

Or, if you want UX feedback, use a **brief** toast/flash message after the request, not a button-level spinner:
```tsx
const handleSignOut = () => {
  router.delete('/users/sign_out', {
    onSuccess: () => console.log('Logged out'),
    onError: () => setFlash('Sign out failed, try again'),
  });
};
```

#### 3.2 Implementation guidance grounded in current code

- `Landing.tsx` already demonstrates the existing navigation destinations and sign-out behavior — use it as reference but NOT as a copy template
- `ApplicationController` already shares `current_user`, so no extra controller props are needed for this page
- keep the nav intentionally minimal so it contains exactly two interactive elements

Recommended sign-out implementation:

- use an Inertia `router.delete()` action that performs `DELETE /users/sign_out` **without** a processing state that disables the button
- optional: log brief feedback to console or flash, but do NOT block the button

### Step 4. Add feature documentation

Create `video_chat_and_translator/docs/features/dashboard.md`.

Document:

- authenticated root behavior (`/` for signed-in users now renders dashboard)
- preserved guest root behavior
- dashboard page location
- profile/sign-out navigation
- files changed and why `Landing.tsx` remains in the codebase

This satisfies the repo rule that new public files and feature behavior must be documented under `/docs`.

### Step 5. System-test harness decision gate + Docker verification

This is a blocked step that requires explicit user approval.

#### 5.1 Current Docker/Chromium state

Before proceeding, verify the baseline:

- Read `video_chat_and_translator/Dockerfile` line 1-30 to check current OS packages and base image
- Read `docker/docker-compose.yml` line 1-30 to check web service build context
- Document what's missing for headless browser (Chromium + supporting libs for Cuprite)

**Expected issue:** Current Dockerfile likely has only basic packages (Ruby + Node) without Chromium or browser drivers.

#### 5.2 Required additions if gems are approved

**Browser stack choice: Cuprite (recommended for Rails + Docker)**

Rationale:
- Built on Chromium (not Selenium)
- Better Docker compatibility than Capybara/Selenium
- Lower resource footprint in containers
- Integrates seamlessly with RSpec type: :system

**Gemfile additions (approval needed):**
```ruby
group :test do
  gem 'capybara'
  gem 'cuprite'  # headless Chromium driver for Capybara
end
```

**Dockerfile additions (approval needed):**

Must add to `video_chat_and_translator/Dockerfile` BEFORE the Ruby setup:
```dockerfile
# Install Chromium and dependencies for Cuprite
RUN apt-get update && apt-get install -y \
    chromium-browser \
    chromium-driver \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*
```

**spec/support/capybara.rb (new file, if approved):**
```ruby
Capybara.configure do |config|
  config.default_driver = :cuprite
  config.javascript_driver = :cuprite
end

Capybara.register_driver :cuprite do |app|
  Capybara::Cuprite::Driver.new(
    app,
    headless: true,
    process_timeout: 30,
    timeout: 30,
    browser_options: {
      'disable-gpu' => true,
      'no-sandbox' => true,
    }
  )
end
```

**spec/rails_helper.rb changes (if approved):**
- Line ~35: Ensure RSpec config has `config.before(:each, type: :system)` hook
- If not present, add Devise helper for system specs to support authenticated routes:
```ruby
RSpec.configure do |config|
  # ... existing config ...
  config.before(:each, type: :system) do
    # Support authenticated user login for system specs
    # (will be called from dashboard_navigation_spec.rb)
  end
end
```

#### 5.3 If approval is NOT granted

- Complete Steps 1-4 and 7 (request-level + manual verification)
- Do NOT create `spec/system/dashboard_navigation_spec.rb`
- Explicitly document in Definition of Done (Step 7) that browser-level coverage is blocked pending test tooling approval

#### 5.4 If approval IS granted

- Apply all Dockerfile, Gemfile, and support file changes
- Ensure Docker image rebuilds with `docker compose build web` before running Step 6
- Verify Capybara driver initialization with a minimal manual test before writing full spec

### Step 6. Add browser-level dashboard navigation spec

Create `video_chat_and_translator/spec/system/dashboard_navigation_spec.rb` only after Step 5 is complete.

#### 6.1 Authentication for system specs

**Devise helper setup (in spec/rails_helper.rb or spec/support/devise.rb):**

System specs cannot use normal Devise session helpers. Add this helper:

```ruby
RSpec.configure do |config|
  config.include Devise::Test::IntegrationHelpers, type: :system
end
```

**Alternative (if helper above doesn't work for system):**

Use Warden directly in `before` hook:
```ruby
before { login_as(user, scope: :user) }
```

Verify approach by reading `video_chat_and_translator/spec/rails_helper.rb:35` and checking what's already configured.

#### 6.2 Spec scenarios

Create `video_chat_and_translator/spec/system/dashboard_navigation_spec.rb` with these scenarios:

**Scenario 1: Dashboard displays with correct heading and exactly two nav actions**

```gherkin
Given an authenticated user
When they visit `/`
Then they see "Dashboard" heading
And they see exactly two nav elements:
  - Link to "Profile" (href: /users/profile)
  - Button "Sign Out" (form with DELETE action)
```

**Scenario 2: Profile link navigates to user profile page**

```gherkin
Given an authenticated user on dashboard
When they click "Profile" link
Then they are redirected to `/users/profile`
And they see profile content
```

**Scenario 3: Sign Out button logs out and redirects**

```gherkin
Given an authenticated user on dashboard
When they click "Sign Out" button
Then a DELETE request is sent to `/users/sign_out`
And they are redirected to login page
And the session is destroyed
```

**Scenario 4 (CRITICAL): Sign Out button remains visible and active even if server is unreachable**

This is acceptance criterion #4 from spec.md — **must be verified**.

Implementation approach:

1. **Setup:** Mock/intercept the DELETE request to `/users/sign_out` to simulate server failure or delay
   - Use Capybara's request stubbing OR
   - Use a before_action hook that aborts the DELETE request with an error status

2. **Action:** User clicks "Sign Out" button while mock intercepts the request

3. **Assertion:** Verify that:
   - The sign-out button element **remains visible** in the DOM (no `display: none`)
   - The button **remains clickable/enabled** (no `disabled` attribute, no `opacity: 0.5`)
   - No loading spinner or processing state persists indefinitely
   - Page does NOT crash or show a blank state

```ruby
describe 'Sign Out button resilience' do
  scenario 'button remains visible/active when sign_out request fails' do
    # Setup: intercept DELETE /users/sign_out and return 500
    allow_any_instance_of(Devise::SessionsController)
      .to receive(:destroy).and_return(head 500)
    
    # OR use Capybara request stubbing:
    # page.driver.network_traffic.select { |req| req.url.include?('sign_out') }
    #   .first.abort if present
    
    # Action
    visit '/'
    click_button 'Sign Out'
    
    # Assertion: button is still visible and clickable
    sign_out_button = find_button('Sign Out')
    expect(sign_out_button).to be_visible
    expect(sign_out_button).not_to be_disabled
    
    # Assertion: no persistent spinner/loading state
    expect(page).not_to have_css('[data-testid="sign-out-loading"]')
  end
end
```

**Implementation tip for Dashboard.tsx:**

To pass scenario 4, the sign-out button must:
- NOT use `disabled={processing}` state tied to request completion
- NOT render a spinner that only clears on success
- Remain clickable/visible regardless of request state
- Optionally show brief feedback but recover to enabled state

Keep this spec focused on user-visible behavior. Do not duplicate lower-level redirect assertions already covered in request specs.

## 5. Risks / Conflict Notes

### No conflict

- Root routing already matches the desired behavior; only the rendered page changes.
- Existing `/users/profile` and `/users/sign_out` endpoints already satisfy the dashboard navigation requirements.
- No callback, concern, service object, migration, or route refactor is justified here.

### Actual risks (discovered after reviewer feedback)

1. **Docker image missing Chromium dependencies**
   - Current `Dockerfile` likely lacks browser/driver packages needed for Cuprite
   - System specs will FAIL unless Dockerfile is updated with OS packages
   - Must be fixed BEFORE Step 5 begins

2. **System spec authentication not configured**
   - Devise integration helpers are not documented in current `spec/rails_helper.rb`
   - Specs cannot authenticate users without explicit setup
   - Must add Devise helper or Warden.test_mode setup

3. **Sign-Out button implementation must not use processing state**
   - Naive implementation with `disabled={processing}` violates AC #4
   - Button can persist in disabled state if request fails
   - Spec explicitly requires button to remain **visible and active** even on error
   - Implementation must avoid processing-state tie-in (Step 3.1)

4. **Frontend validation missing from verification**
   - Request specs only verify component NAME in response, not file compilation
   - TS errors in Dashboard.tsx can hide from request-level tests
   - Must run `npm run check` as part of verification (Step 7/8)

## 6. Verification Plan (corrected: Step 7 → Step 8)

Run inside Docker, using the existing `web` service from `docker/docker-compose.yml`.

### Always required

**1. Request-level specs:**
```bash
docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/requests/pages_spec.rb spec/requests/users/sessions_spec.rb
```

Expected: All examples pass, confirming server-side routing and Inertia rendering.

**2. Frontend TypeScript validation (CRITICAL for new Dashboard.tsx):**
```bash
docker compose -f docker/docker-compose.yml exec web npm run check
```

Expected: No TypeScript errors in `app/frontend/pages/Dashboard.tsx` or import chain.

Rationale: Request specs only verify that the component NAME is rendered in Inertia response, not that the file compiles. This check catches TS/import errors that request specs miss.

### Required only if system-test tooling is approved and added

**3. System/browser specs:**
```bash
docker compose -f docker/docker-compose.yml exec web bundle exec rspec spec/system/dashboard_navigation_spec.rb
```

Expected: All scenarios pass, confirming:
- Dashboard renders with correct heading and nav
- Profile link works
- Sign Out flow completes
- **Sign Out button remains visible/active even on server error (Scenario 4)**

### Optional confidence check

```bash
docker compose -f docker/docker-compose.yml exec web bundle exec rspec
```

Expected: All specs pass (request + system, if system tooling was approved).

## 7. Definition of Done

### Always required (regardless of system-test approval)

- [ ] Authenticated `GET /` renders `Dashboard` via Inertia.
- [ ] Guest `GET /` still redirects to login.
- [ ] `Dashboard.tsx` exists and contains exactly two navigation actions: profile and sign out.
- [ ] `Landing.tsx` remains in the repo untouched.
- [ ] Feature documentation exists under `docs/features/dashboard.md`.
- [ ] Request specs pass: `spec/requests/pages_spec.rb`, `spec/requests/users/sessions_spec.rb`
- [ ] Frontend TypeScript validation passes: `npm run check` succeeds with no errors in Dashboard.tsx or imports
- [ ] No console errors or warnings in the new page (browser inspection)

### Required only if system-test gems are approved and added

- [ ] Dockerfile updated with Chromium/browser dependencies (if approval granted)
- [ ] Gemfile updated with Capybara + Cuprite (if approval granted)
- [ ] spec/support/capybara.rb created with headless driver config (if approval granted)
- [ ] spec/rails_helper.rb updated with Devise integration helper for system specs (if approval granted)
- [ ] System spec `spec/system/dashboard_navigation_spec.rb` passes **all 4 scenarios**, including:
  - Scenario 1: Dashboard heading + exactly 2 nav elements
  - Scenario 2: Profile link navigates to `/users/profile`
  - Scenario 3: Sign Out logs out and redirects to login
  - **Scenario 4: Sign Out button remains visible/active even if server request fails** (AC from spec.md line 73)

### If system-test approval is NOT granted

- [ ] Explicitly document in PR/issue comment that browser-level navigation coverage is blocked pending test tooling approval
- [ ] Request specs and frontend validation must still pass
- [ ] Do NOT create `spec/system/dashboard_navigation_spec.rb`
