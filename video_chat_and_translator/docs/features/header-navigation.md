# Header Navigation Feature

## Route Map

| Method | Path                  | Controller                           | Auth | Behavior                             |
| ------ | --------------------- | ------------------------------------ | ---- | ------------------------------------ |
| GET    | `/`                   | `Pages::LandingController#show`      | No   | Available to all users               |
| GET    | `/dashboard`          | `Pages::DashboardController#show`    | Yes  | Guests redirected to `/`             |
| GET    | `/users/sign_in`      | `Users::SessionsController#new`      | No   | Authenticated redirect to dashboard  |
| GET    | `/users/sign_up`      | `Users::RegistrationsController#new` | No   | Authenticated redirect to dashboard  |
| POST   | `/users/sign_in`      | `Users::SessionsController#create`   | No   | On success redirect to dashboard     |
| DELETE | `/users/sign_out`     | `Users::SessionsController#destroy`  | No   | On success redirect to `/`           |
| GET    | `/users/profile`      | `Users::ProfileController#show`      | Yes  | Guests redirected to sign_in         |
| GET    | `/videos`             | `VideosController#index`             | Yes  | Guests redirected to sign_in         |
| GET    | `/videos/:id`         | `VideosController#show`              | Yes  | Guests redirected to sign_in         |

## Controllers

### `Pages::LandingController`

- Inherits from `InertiaController`
- Skips `authenticate_user!`
- Renders `Landing` component with `app_name` prop

### `Pages::DashboardController`

- Inherits from `InertiaController`
- Skips `authenticate_user!`, uses custom `require_authenticated_user` which redirects to `/` for guests
- Renders `Dashboard` component

### `Users::SessionsController`

- Includes `RedirectAuthenticatedUser` concern (provides `redirect_if_authenticated` method)
- `new` action: calls `redirect_if_authenticated` to send authenticated users to `/dashboard`
- `create` action: on success redirects to `dashboard_path`
- `destroy` action: redirects to `root_path` (not login page)

### `Users::RegistrationsController`

- Includes `RedirectAuthenticatedUser` concern
- `new` action: calls `redirect_if_authenticated` to send authenticated users to `/dashboard`

## Global Layout

Authenticated users see a **«Видео»** nav link in the Header pointing to `/videos`.

All Inertia pages are wrapped by `AppLayout` (set via persistent layout in `inertia.tsx`):

```text
AppLayout
  Header (navigation)
  Toast (flash + logout error notifications)
  main (page content)
```

## Key Conventions

- **Auth redirect target**: Authenticated users always redirect to `/dashboard` (via `after_sign_in_path_for` in `ApplicationController`)
- **Guest redirect for protected pages**: `/users/sign_in` (Devise default), except `/dashboard` which redirects to `/`
- **Flash centralization**: `Toast` is rendered only in `AppLayout`. Flash blocks removed from Login, Register, ForgotPassword, ResetPassword, Profile pages.
- **Logout error**: Network/server errors on logout are caught client-side via `router.delete` callbacks and shown via Toast's `error` prop.

## `RedirectAuthenticatedUser` Concern

**File:** `app/controllers/concerns/redirect_authenticated_user.rb`

Provides `redirect_if_authenticated` helper method called explicitly in `new` actions of Devise controllers. Avoids `before_action` in concerns to prevent conflicts with Devise's `prepend_before_action` chain.

```ruby
def redirect_if_authenticated
  redirect_to dashboard_path if user_signed_in?
end
```
