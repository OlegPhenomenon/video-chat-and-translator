# Dashboard Feature

## Overview

The Dashboard is the authenticated user's root page (`GET /`). It replaces the marketing Landing page for logged-in users, providing a dedicated space for navigation and future feature expansion.

## Behavior

### Authenticated Users

- **Route:** `GET /`
- **Rendered Component:** `Dashboard` (Inertia.js)
- **Location:** `app/frontend/pages/Dashboard.tsx`
- **Access:** Protected by `before_action :authenticate_user!` in `ApplicationController`

### Guest Users

- **Route:** `GET /`
- **Behavior:** Redirects to login page (`new_user_session_path`)
- **Routing:** Managed by Devise configuration in `config/routes.rb`

### Landing Page

- **Preserved:** The marketing page `app/frontend/pages/Landing.tsx` remains in the codebase but is not rendered via the root route
- **Reason:** Allows future re-use (e.g., marketing subdomain, alternate landing routes)

## Navigation Elements

The Dashboard contains exactly two navigation actions:

1. **Profile Link**
   - Text: "Profile"
   - Target: `/users/profile`
   - Type: `<Link>` (Inertia navigation)
   - Styling: Indigo button

2. **Sign Out Button**
   - Text: "Sign Out"
   - Action: `DELETE /users/sign_out`
   - Method: `router.delete()` via Inertia.js
   - Styling: Gray button
   - Behavior: Button remains visible and active even if the sign-out request fails (server unavailability resilience)

## Files Changed

### Modified

- `app/controllers/pages_controller.rb` — Changed index action to render Dashboard
- `spec/requests/pages_spec.rb` — Updated expectations for Dashboard component

### Created

- `app/frontend/pages/Dashboard.tsx` — New authenticated root page
- `docs/features/dashboard.md` — This documentation file

### Unchanged

- `app/frontend/pages/Landing.tsx` — Preserved marketing page
- `config/routes.rb` — No route changes needed
- Database schema — No changes

## Testing

### Request-Level Specs

- `spec/requests/pages_spec.rb` verifies:
  - Authenticated users see Dashboard component
  - Guest users redirect to login

### System-Level Specs (Optional)

- `spec/system/dashboard_navigation_spec.rb` (if system testing tooling is approved):
  - Dashboard displays with heading and nav elements
  - Profile link navigates correctly
  - Sign Out flow completes
  - Sign Out button resilience on server error

## Future Enhancements

The Dashboard page is intentionally minimal to serve as a foundation for:

- User statistics and activity summary
- Quick-access links to main features
- Recent activity feed
- Settings shortcuts
