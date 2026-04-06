# Implementation Plan: 005 Dashboard Creation

**Source spec:** `./spec.md`  
**Prepared:** 06.04.2026  
**Revised after reviewer feedback:** 06.04.2026

## Summary of Reviewer Feedback Fixes

This plan addresses the original 5 comments + 4 follow-up corrections:

### Original 5 comments (FIXED):

1. **Step 5 (Docker completeness):** Expanded with full Dockerfile/docker-compose.yml analysis, Cuprite stack choice, exact OS packages needed, and headless browser config (Sections 5.1–5.4)

2. **Steps 5, 7 & Definition of Done (Authentication):** Added specific Devise integration helpers for system specs, Warden fallback, and spec/rails_helper.rb requirements (Sections 5.2, 6.1)

3. **Steps 3 & 6 (Server unavailability AC):** Added Step 3.1 with INCORRECT vs CORRECT sign-out button patterns, and Step 6.2 Scenario 4 with concrete test assertions for button resilience (Sections 3.1, 6.2)

4. **Step 7 (Frontend validation):** Added Step 7 for TypeScript checking, `npm run check` in verification plan, and DoD requirement for frontend compilation validation (Sections 6, 7)

5. **Definition of Done completeness:** Split into "Always required" vs "Only if approved" checklists with explicit system spec scenario list, including Scenario 4 (Section 7)

### Follow-up 4 corrections (FIXED):

1. **Step 5 (Dockerfile path — CRITICAL):** Corrected to edit `docker/Dockerfile:1` (not video_chat_and_translator/Dockerfile). Docker-compose builds from docker/Dockerfile, so production Dockerfile changes don't affect dev tests (Sections 5.1, 5.4, Risks #1)

2. **Chromium packages (Debian slim specifics):** Corrected package list: use `chromium` (not chromium-browser), include runtime deps (libnss3, libxss1, libappindicator3-1), DO NOT use chromium-driver (Cuprite uses CDP, not WebDriver) (Sections 5.2, Risks #2)

3. **Step 6.1 (System spec authentication):** Clarified that ONLY solution is `config.include Devise::Test::IntegrationHelpers, type: :system` + `login_as(user, scope: :user)` in before hooks. No alternatives, no Warden setup needed (Sections 6.1, Risks #3)

4. **Step 6.2 (Scenario 4 — server error resilience):** Replaced non-working examples with real stubs: use `allow_any_instance_of(Users::SessionsController)` (not Devise base), mock destroy to return error, verify button remains visible/enabled. Includes COMPLIANT React implementation pattern (Sections 6.2.4, Risks #4)

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

- `video_chat_and_translator/Gemfile` — add Capybara + Cuprite gems
- **`docker/Dockerfile`** — add Chromium OS packages (not video_chat_and_translator/Dockerfile!)
- `video_chat_and_translator/spec/rails_helper.rb` (line 37) — add Devise::Test::IntegrationHelpers for type: :system
- `video_chat_and_translator/spec/support/capybara.rb` (new) — Cuprite driver config
- `video_chat_and_translator/spec/system/dashboard_navigation_spec.rb` (new) — 4 scenarios with server error resilience test

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
| 5 | Establish browser/system test harness (decision gate + Docker verification) | 1 | **`docker/Dockerfile`** (not video_chat_and_translator/), `Gemfile`, `spec/rails_helper.rb`, `spec/support/capybara.rb` | Dev Docker image supports headless Chromium; `type: :system` specs can run; Devise integration helpers configured |
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

#### 5.1 Current Docker/Chromium state — CORRECTED

**CRITICAL:** Dev environment builds from `docker/Dockerfile:1` (not `video_chat_and_translator/Dockerfile`).

Verify this:
- `docker/docker-compose.yml:5-7` specifies `dockerfile: ../docker/Dockerfile`
- Changes to `video_chat_and_translator/Dockerfile` do NOT affect dev environment
- Must modify **`docker/Dockerfile`** to add browser dependencies

Current `docker/Dockerfile` state (line 1-30):
- Base: `ruby:3.4.9-slim`
- Has build-essential, Node.js 22, but NO browser/Chromium packages
- Missing Cuprite/Ferrum runtime dependencies

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

**docker/Dockerfile additions (approval needed):**

Add to `docker/Dockerfile` AFTER Node.js installation (after line 17):

```dockerfile
# Install Chromium and dependencies for Cuprite (headless browser testing)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    chromium \
    chromium-common \
    libnss3 \
    libxss1 \
    libappindicator3-1 \
    libindicator7 \
    && rm -rf /var/lib/apt/lists/*
```

**Rationale for packages:**
- `chromium`: Headless browser executable (for Cuprite)
- `chromium-common`: Chromium shared libraries
- `libnss3`, `libxss1`, `libappindicator3-1`: Runtime dependencies for Chromium on Debian slim
- **NOT chromium-driver** (Cuprite/Ferrum don't use WebDriver protocol)

**spec/support/capybara.rb (new file, if approved):**
```ruby
Capybara.configure do |config|
  config.default_driver = :cuprite
  config.javascript_driver = :cuprite
  config.server = :webrick
  config.default_max_wait_time = 2
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
      'disable-dev-shm-usage' => true,
    }
  )
end
```

**spec/rails_helper.rb changes (if approved):**

Add Devise integration helper for system specs (line 37, add new line after request config):

```ruby
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.include Devise::Test::IntegrationHelpers, type: :system  # ← NEW: Support authenticated system specs
  config.before(:each) { ActiveJob::Base.queue_adapter = :test }
  
  # ... rest of config ...
end
```

This allows system specs to use `login_as(user, scope: :user)` helper.

#### 5.3 If approval is NOT granted

- Complete Steps 1-4 and 7 (request-level + manual verification)
- Do NOT create `spec/system/dashboard_navigation_spec.rb`
- Explicitly document in Definition of Done (Step 7) that browser-level coverage is blocked pending test tooling approval

#### 5.4 If approval IS granted

- Add Chromium packages to `docker/Dockerfile` (not video_chat_and_translator/Dockerfile)
- Add Capybara + Cuprite gems to Gemfile
- Create `spec/support/capybara.rb` with driver config
- Add Devise helper line to `spec/rails_helper.rb:37`
- Rebuild Docker image: `docker compose build web`
- Verify Capybara initialization with minimal test before writing full spec

### Step 6. Add browser-level dashboard navigation spec

Create `video_chat_and_translator/spec/system/dashboard_navigation_spec.rb` only after Step 5 is complete.

#### 6.1 Authentication for system specs — CORRECTED

The Devise integration helper must be added in Step 5 to `spec/rails_helper.rb:37`:

```ruby
config.include Devise::Test::IntegrationHelpers, type: :system
```

This allows system spec helper `before` hooks to use:

```ruby
before { login_as(user, scope: :user) }
```

This is the **ONLY way** to authenticate system specs in Rails + Devise. It logs in the user into the browser session before test execution.

**Why this works:**
- `Devise::Test::IntegrationHelpers` injects Warden test helpers into integration/system tests
- `login_as(user, scope: :user)` sets up a valid session inside Capybara's browser context
- Does NOT rely on cookies or request headers (those are for :request specs)
- Works inside Cuprite's headless Chromium process

No alternative setup is needed in `spec/support/` for authentication.

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

#### 6.2.4.1 Implementation approach — CORRECTED

The key is to stub the **actual** `Users::SessionsController#destroy` (not Devise's) and make it behave like a server error.

```ruby
describe 'Sign Out button resilience' do
  scenario 'button remains visible/active when sign_out request fails' do
    user = create(:user)
    
    # Setup: Make Users::SessionsController#destroy raise an error or return failure
    allow_any_instance_of(Users::SessionsController).to receive(:destroy) do |instance|
      # Simulate server error: render error response instead of redirecting
      instance.render json: { error: 'Service unavailable' }, status: :service_unavailable
    end
    
    # Action: User is logged in and visits dashboard
    login_as(user, scope: :user)
    visit '/'
    
    # Verify button is present and clickable
    expect(page).to have_button('Sign Out')
    sign_out_button = find_button('Sign Out')
    expect(sign_out_button).to be_enabled
    expect(sign_out_button).to be_visible
    
    # Click the button (request will fail, but button stays visible)
    click_button 'Sign Out'
    
    # Assertion: button remains present and NOT disabled/hidden
    # (Page does not hang, crash, or show persistent loading state)
    expect(page).to have_button('Sign Out')
    expect(find_button('Sign Out')).to be_enabled
    
    # Optional: verify still on dashboard (user still authenticated)
    expect(page).to have_content('Dashboard')
  end
end
```

**Why this stub approach works:**

1. `allow_any_instance_of(Users::SessionsController)` patches the correct controller (not Devise's base)
2. `.to receive(:destroy).and_call_original` would let the real code run; here we override it
3. `.render` is a valid ActionController method that Cuprite can handle
4. Simulates realistic failure: server returns error, page does NOT redirect, button remains visible

**Implementation requirement for Dashboard.tsx:**

To **pass** this scenario, the sign-out button must:

- **NOT use `disabled={processing}` or `disabled={isLoading}`**
  - Disabling the button violates the AC: "remains visible and active"
- **NOT show a spinner that persists after failure**
  - A persistent loading state is visually equivalent to disabling
- **Remain clickable even if request fails**
  - Button handler should allow re-clicking on failure (idempotent)
- **Optional UX:** Brief toast/flash message is acceptable, but don't block interaction

Example of COMPLIANT implementation:
```tsx
const handleSignOut = () => {
  router.delete('/users/sign_out', {
    onError: () => {
      // Optional: Log error, show flash, but do NOT disable button
      console.error('Sign out failed');
    },
  });
  // Button remains enabled and clickable regardless of request outcome
};

return <button onClick={handleSignOut}>Sign Out</button>;
```

Keep this spec focused on user-visible behavior. Do not duplicate lower-level redirect assertions already covered in request specs.

## 5. Risks / Conflict Notes

### No conflict

- Root routing already matches the desired behavior; only the rendered page changes.
- Existing `/users/profile` and `/users/sign_out` endpoints already satisfy the dashboard navigation requirements.
- No callback, concern, service object, migration, or route refactor is justified here.

### Actual risks (discovered after reviewer feedback) — CORRECTED

1. **Dev Docker image missing Chromium — CRITICAL**
   - Dev environment builds from `docker/Dockerfile:1` (via docker-compose.yml:5-7)
   - Changes to `video_chat_and_translator/Dockerfile` (production image) do NOT affect dev tests
   - System specs will FAIL unless **`docker/Dockerfile`** is updated with Chromium packages
   - Must edit the **correct** Dockerfile: `docker/Dockerfile` (not video_chat_and_translator/Dockerfile)

2. **Chromium packages must be correct for Debian slim**
   - `chromium-browser` is unreliable on Debian slim; use `chromium` instead
   - Do NOT use `chromium-driver` (Cuprite/Ferrum use CDP protocol, not WebDriver)
   - Must include runtime deps: `libnss3`, `libxss1`, `libappindicator3-1`
   - Without correct packages, Cuprite will fail to start headless browser

3. **System spec authentication — CORRECTED**
   - Must add `config.include Devise::Test::IntegrationHelpers, type: :system` to `spec/rails_helper.rb:37`
   - Allows `login_as(user, scope: :user)` helper in system spec `before` hooks
   - This is the **ONLY way** to set up authenticated browser sessions for Devise + Capybara
   - No alternative setup needed

4. **Sign-Out button error handling must be testable — CORRECTED**
   - Cannot use `allow_any_instance_of(Devise::SessionsController)` (wrong controller)
   - Must stub `Users::SessionsController#destroy` (the actual custom controller)
   - Use `.to receive(:destroy).and_call_original` with controller action override
   - Scenario 4 verifies button remains visible/enabled even when request returns error
   - Button implementation must NOT use `disabled={processing}` tied to request state

5. **Frontend validation missing from verification**
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

- [ ] **`docker/Dockerfile`** updated with Chromium packages: `chromium`, `chromium-common`, `libnss3`, `libxss1`, `libappindicator3-1` (if approval granted)
  - CRITICAL: Update `docker/Dockerfile` (not video_chat_and_translator/Dockerfile — that's production-only)
  - Verify via `docker compose build web` that image builds successfully
- [ ] Gemfile updated with `capybara` and `cuprite` gems (if approval granted)
- [ ] spec/rails_helper.rb line 37 updated: add `config.include Devise::Test::IntegrationHelpers, type: :system` (if approval granted)
- [ ] spec/support/capybara.rb created with headless Cuprite driver config (if approval granted)
- [ ] System spec `spec/system/dashboard_navigation_spec.rb` passes **all 4 scenarios**, including:
  - Scenario 1: Dashboard heading + exactly 2 nav elements
  - Scenario 2: Profile link navigates to `/users/profile`
  - Scenario 3: Sign Out logs out and redirects to login
  - **Scenario 4: Sign Out button remains visible/active even if `Users::SessionsController#destroy` returns 500 error** (AC from spec.md line 73)

### If system-test approval is NOT granted

- [ ] Explicitly document in PR/issue comment that browser-level navigation coverage is blocked pending test tooling approval
- [ ] Request specs and frontend validation must still pass
- [ ] Do NOT create `spec/system/dashboard_navigation_spec.rb`
