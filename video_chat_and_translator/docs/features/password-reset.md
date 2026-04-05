# Password Reset (Forgot Password)

**Feature:** 002-forgot-password  
**Status:** Implemented

## Overview

Registered users with a **confirmed email** can reset their password via email link. Users without a confirmed email cannot complete the reset flow (anti-enumeration policy applies).

## E2E Flow

1. User clicks "Forgot password?" on the login page.
2. User submits their email on `/users/password/new` (`ForgotPassword` page).
3. If user exists **and** is confirmed → `send_reset_password_instructions` is called (email queued via Sidekiq).
4. User receives email with link: `/users/password/edit?reset_password_token=<token>`.
5. User sets a new password on the `ResetPassword` page.
6. On success → redirect to sign in page with flash notice.

## Anti-enumeration Policy

At the email submission step, **always** the same neutral message is shown regardless of:

- Whether the email is registered
- Whether the account is confirmed
- Whether the email was actually sent

This prevents account enumeration attacks.

## Routes

| Method | Path                   | Controller#Action        |
| ------ | ---------------------- | ------------------------ |
| GET    | `/users/password/new`  | `users/passwords#new`    |
| POST   | `/users/password`      | `users/passwords#create` |
| GET    | `/users/password/edit` | `users/passwords#edit`   |
| PATCH  | `/users/password`      | `users/passwords#update` |

## Files

| Area | File |
| ---- | ---- |
| Model | `app/models/user.rb` — added `:recoverable` |
| Routes | `config/routes.rb` — added `passwords: "users/passwords"` |
| Controller | `app/controllers/users/passwords_controller.rb` |
| Sessions controller | `app/controllers/users/sessions_controller.rb` — added `forgot_password_url` prop |
| Email template | `app/views/devise/mailer/reset_password_instructions.html.erb` |
| Locales | `config/locales/ru.yml` — keys: `auth.passwords.*`, `devise.passwords.*`, `devise.mailer.reset_password_instructions.*` |
| Frontend | `app/frontend/pages/auth/ForgotPassword.tsx` |
| Frontend | `app/frontend/pages/auth/ResetPassword.tsx` |
| Frontend | `app/frontend/pages/auth/Login.tsx` — added "Forgot password?" link |
| Tests | `spec/requests/users/passwords_spec.rb` |

## Key Implementation Details

- **`:recoverable`** Devise module activated in `User` model. No migration needed — columns `reset_password_token` and `reset_password_sent_at` were created in the initial `DeviseCreateUsers` migration.
- Token validity: **6 hours** (`config.reset_password_within = 6.hours` in `devise.rb`).
- Email delivery: **`deliver_later`** via Sidekiq (via the existing `User#send_devise_notification` override).
- Only confirmed users receive reset emails (`user&.confirmed?` check in `PasswordsController#create`).
- `forgot_password_url` is passed as a prop from `SessionsController#new` — not hardcoded in the React component.
