# Stack Overview

## Tech Stack

- **Backend**: Ruby on Rails 8.1.3 (Ruby 3.4.9)
- **Frontend**: React 19 + TypeScript + Inertia.js
- **Build Tool**: Vite 8 + vite-plugin-ruby
- **CSS**: Tailwind CSS v4 (@tailwindcss/vite)
- **Database**: PostgreSQL 17
- **Environment**: Docker Compose

## Architecture

Monolith (Rails + React via Inertia.js). No separate API — Inertia bridges server-side controllers and client-side React components.

## Key Directories

- `app/controllers/` — Rails controllers (render Inertia pages)
- `app/frontend/pages/` — React page components (resolved by Inertia)
- `app/frontend/entrypoints/` — Vite entrypoints (inertia.tsx, application.css)
- `app/frontend/assets/` — Static assets (SVGs, images)
- `config/initializers/inertia_rails.rb` — Inertia configuration
- `docker/` — Dockerfile + docker-compose.yml

## Controllers Pattern

Controllers inherit from `InertiaController` and render pages:

```ruby
class PagesController < InertiaController
  def index
    render inertia: "Landing", props: { app_name: "Video Chat & Translator" }
  end
end
```

React components receive props directly:

```tsx
export default function Landing({ app_name }: { app_name: string }) {
  return <h1>{app_name}</h1>
}
```
