# SocialPilot — Frontend (Next.js)

Milestone 1 frontend: authentication, dashboard shell, and a light/dark theme
system built around the dot-grid map graphic from the original loading page.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it boots into the map loader, then routes to `/login`.

## Structure

```
app/
  page.jsx              full-screen boot loader (~2.2s) → redirects to /login
  login/page.jsx        renders <AuthScreen initialMode="login" />
  signup/page.jsx       renders <AuthScreen initialMode="signup" />
  dashboard/page.jsx     overview (stats + setup checklist)
  layout.jsx             wraps everything in ThemeProvider
  globals.css            theme tokens (CSS vars) + map-loader animation styles
components/
  MapLoader.jsx          the dot-grid world map, reused as boot loader + auth side panel
  AuthScreen.jsx          combined login/signup screen — mode switches in place via
                          local state (no page reload); URL syncs to /login or /signup
  DashboardShell.jsx      sidebar + topbar shell for authenticated pages
  ThemeToggle.jsx         light/dark switch
context/
  ThemeContext.jsx        theme state, persisted to localStorage, respects OS preference
```

## Flow

`/` (loader, ~2.2s) → `/login` → user can switch to sign-up in place, or log in
directly → `/dashboard` on submit. Both `/login` and `/signup` render the same
`AuthScreen` component so the mode-switch never triggers a full navigation.

## Theming

Dark mode toggles the `.dark` class on `<html>`, which swaps the CSS variables
defined in `globals.css` (`--bg-canvas`, `--bg-surface`, `--ink`, `--ink-muted`,
`--line`, `--teal`). Add new components using those variables (or the
`.surface`, `.input-field`, `.btn-primary-teal` / `.btn-outline-soft` helper
classes) rather than hardcoded colors, and they'll theme automatically.

## Still to build (not in this pass)

- `/dashboard/connect` — social account connection cards (Facebook, Instagram,
  LinkedIn, X, YouTube, Pinterest)
- `/dashboard/team` — member table + invite modal, gated by role
- `/dashboard/settings` — profile, password, notification preferences
- Wiring `login`/`signup` submit handlers to the real FastAPI
  `/api/auth/login` and `/api/auth/register` endpoints (currently mocked
  with a `setTimeout`)

These follow the same page/field breakdown as the earlier HTML mockup —
happy to port them into this same Next.js structure next.
