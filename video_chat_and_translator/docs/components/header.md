# Header Component

**File:** `app/frontend/components/Header.tsx`

## Overview

Global navigation header rendered on all Inertia pages via `AppLayout`. Shows different menus depending on user authentication state.

## Props

| Prop             | Type                              | Description                                                                 |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `onLogoutError`  | `(message: string) => void`       | Optional callback called when logout request fails (network/server error)   |

## Shared Props (via `usePage`)

| Prop           | Type                                         | Description                                    |
| -------------- | -------------------------------------------- | ---------------------------------------------- |
| `current_user` | `{ id: number; email: string } \| undefined` | Current authenticated user or undefined (guest) |

The `page.url` is used to determine the current path for active-state styling.

## Guest Menu (unauthenticated)

| Item              | `data-testid` | Path             | Condition                           |
| ----------------- | ------------- | ---------------- | ----------------------------------- |
| Главная           | `menu-home`   | `/`              | Hidden when `currentPath === '/'`   |
| Зарегистрироваться | `menu-signup` | `/users/sign_up` | Always shown                        |
| Авторизоваться    | `menu-signin` | `/users/sign_in` | Always shown                        |

## Auth Menu (authenticated)

| Item     | `data-testid`     | Path              |
| -------- | ----------------- | ----------------- |
| Главная  | `menu-home-auth`  | `/`               |
| Дашборд  | `menu-dashboard`  | `/dashboard`      |
| Профиль  | `menu-profile`    | `/users/profile`  |
| Выйти    | `menu-logout`     | DELETE `/users/sign_out` |

## Tailwind Specs

- Height: `h-14` (mobile) / `md:h-16` (desktop)
- Padding: `px-4` (mobile) / `md:px-6` (desktop)
- Background: `bg-white` with `border-b border-gray-200`
- Active link: `text-indigo-600 font-semibold`
- Inactive link: `text-gray-600 hover:text-indigo-600`

## Logout Behavior

1. User clicks "Выйти" button
2. Button is disabled, shows "Выход..."
3. `router.delete('/users/sign_out')` is called
4. On success: Inertia refreshes shared props, Header switches to guest menu
5. On error: button re-enabled, `onLogoutError` callback fires → Toast shows error message

## Usage

`Header` is mounted globally in `AppLayout` — do not import or use directly in pages.
