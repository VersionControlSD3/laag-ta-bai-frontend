# Architecture

```
src/
  main.tsx            entry: providers + router + PWA update prompt
  AppProviders.tsx    QueryClient, Preferences, Auth, Celebration providers
  routes.tsx          route table; tabs share AppShell (bottom nav)
  api/                client.ts (fetch + retry), hooks.ts (TanStack Query), types.ts (mirrors openapi.yaml)
  features/
    auth/             Supabase Auth session, or local dev sign-in
    preferences/      theme, language, notification toggles (localStorage)
    bookmarks/        offline-saved landmarks with full story text
    progress/         XP toast and level-up / badge dialog
  hooks/              useGeolocation (rationale-first), useSpeech (Web Speech TTS)
  components/         BottomNav, LandmarkCard, StorySection, XpBar, icons/ (Ionicons), ...
  pages/              one file per screen
  lib/                env, supabase client, storage, image validation, formatting
  styles/index.css    Tailwind + theme tokens (Figma Ivory + Sage, plus the scaffold palette)
```

## Data flow

- **Auth**: the app signs in with Supabase Auth directly and keeps the session in the browser.
  Every API call sends the access token as `Authorization: Bearer`. The API verifies it.
- **App data** always goes through the API, never straight to Supabase tables. That keeps
  XP and progress rules on the server and the Gemini key out of the browser.
- **Server state** lives in TanStack Query. Mutations that award XP (scan, chat, check-in)
  invalidate `me` and `quests` and trigger the celebration UI.
- **Local state** (bookmarks, cached chats, preferences) uses `localStorage` through
  `lib/storage.ts`, which never throws.

## Offline and PWA

- The service worker precaches the app shell and images, so the app opens offline.
- Landmark and quest API responses are cached network-first, and bookmarked landmarks are
  stored with their full story, so saved stories open without a connection (SRS 3.6.3.2).
- Scan and chat need a connection; the API client retries transient failures three times
  with exponential backoff and then shows a friendly error.
- A prompt offers to reload when a new version is deployed.

## Theming

Two palettes live in `styles/index.css` while screens are migrated:

- **Target: Ivory + Sage**, copied from the Figma variables (`ivory`, `ivory-surface`, `navy`,
  `ink-*`, `sage-*`, `terracotta-*`, ...). All new UI uses these. See
  [design-system.md](design-system.md) for every token, the Figma map and the component status.
- **Scaffold: maroon / gold** from the reference prototype (`bg`, `fg`, `surface`, `primary`, ...).
  Placeholder only; don't use it for new work.

Both switch between light and dark via `data-theme` on `<html>`, set from the Light / Dark /
System preference.

## Adding a feature

1. Add or confirm the endpoint in the API's `openapi.yaml`; mirror types in `src/api/types.ts`.
2. Add a client method in `api/client.ts` and a hook in `api/hooks.ts`.
3. Build the page in `pages/` and register it in `routes.tsx` (lazy-loaded).
4. Add a test next to it (`*.test.tsx`) using `renderRoutes` and `mockFetch` from `src/test/render.tsx`.
