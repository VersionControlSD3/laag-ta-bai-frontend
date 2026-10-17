# laag-ta-bai-frontend

Progressive web app for **Laag ta bAI**, the AI travel companion for Cebu heritage sites:
scan a landmark, hear its story, ask the AI guide, and earn XP and badges as you explore.

The backend lives in [`laag-ta-bai-api`](https://github.com/VersionControlSD3/laag-ta-bai-api);
its [`openapi.yaml`](https://github.com/VersionControlSD3/laag-ta-bai-api/blob/development/openapi.yaml)
is the contract this app follows. UI and palette follow the team's Expo prototype
(`Reference_LaagtabAI`), rebuilt for the web as the SRS requires (React PWA).

| | |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4, lucide icons |
| Build | Vite 8 + `vite-plugin-pwa` (installable, offline shell, portrait) |
| Routing / data | React Router, TanStack Query |
| Auth | Supabase Auth (`@supabase/supabase-js`, publishable key only) |
| Tests | Vitest + Testing Library (jsdom) |
| Hosting | Vercel, deployed by GitHub Actions |

## Quick start

Requires Node.js 22.12+ and npm. Run the API first (`laag-ta-bai-api`: `npm ci && npm run dev`).

```sh
npm ci
cp .env.example .env.local   # defaults work with the local API
npm run dev                  # http://localhost:5173
```

Without Supabase values, the sign-in screen offers **Continue as dev traveler**, which works
with the API's memory mode. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for real
accounts (and point the API at the same Supabase project).

To test on a phone on the same Wi-Fi: `npm run dev -- --host`, open the printed network URL,
and add that origin to the API's `CORS_ORIGINS`. Camera capture and geolocation need HTTPS
outside `localhost`, so use a deployed preview (or a tunnel) for full device testing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (`tsc -b`) and production build to `dist/` with the service worker |
| `npm run preview` | Serve the production build locally (test PWA install and offline) |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Environment variables

See [`.env.example`](.env.example). All are `VITE_` variables, bundled into the browser and
therefore **public**. Never put a secret key, database password or account login in one.

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes | API base URL. Default `http://localhost:3000` |
| `VITE_SUPABASE_URL` | for real accounts | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | for real accounts | Publishable / anon key |
| `VITE_GOOGLE_MAPS_API_KEY` | not yet used | Reserved for the interactive map |

## Screens

| Route | Screen |
|---|---|
| `/welcome` | First-run welcome |
| `/login`, `/register` | Supabase sign-in / sign-up (or dev sign-in) |
| `/` | Explore: search, filters, nearby (5 km), popular landmarks |
| `/scan` | Scan-to-Story: camera or gallery photo, validation, result or candidates |
| `/landmarks/:id` | Landmark detail: facts, story accordions with narration, bookmark, check-in |
| `/landmarks/:id/chat` | Ask bAI chat |
| `/archives` | Saved (offline) stories and visit history |
| `/mastery` | Rank, XP bar, streak, stats, quests and badges |
| `/profile` | Profile editing and settings (theme, language, notifications, cache, logout) |

## Documentation

- [Architecture](docs/architecture.md)
- [CI/CD and deployment](docs/ci-cd.md)
- [Team Git workflow (visual guide)](docs/team-workflow.html): branches, PRs, staging and production
- [Branching and branch protection](docs/branching.md)
- [Contributing](CONTRIBUTING.md)
