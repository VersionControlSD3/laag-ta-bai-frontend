# Laag ta bAI frontend: guide for developers and AI agents

A mobile-first React PWA for exploring Cebu's heritage: scan a landmark, hear its story from the AI
guide, earn badges. Read this file first; it links to the details.

## Stack and commands

React 19 + TypeScript, Vite 8 + vite-plugin-pwa (Workbox precache), Tailwind CSS 4, React Router,
TanStack Query, Supabase Auth, Vitest + Testing Library.

```bash
npm ci
cp .env.example .env.local   # without Supabase keys the app uses a local dev sign-in
npm run dev                  # needs the API (laag-ta-bai-api) running for live data
npm run lint && npm test && npm run build   # run all three before every push
```

Code map: [docs/architecture.md](docs/architecture.md). CI/CD and Vercel:
[docs/ci-cd.md](docs/ci-cd.md). Keep `vercel.json` at `deploymentEnabled: false`; GitHub Actions
deploys.

## Workflow

- Branch from **`staging`** as `feature/<name>` or `fix/<name>`, and open the PR into `staging`.
  (`docs/branching.md` and `CONTRIBUTING.md` still say `development`; that branch was removed from
  automation.) `main` and `staging` are protected; PRs are squash-merged.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- Fill in the PR template. **UI PRs need screenshots**: portrait at 360 × 740, light **and** dark,
  every state (empty, loading, error, partial, ...), ideally next to the Figma frame. Link the
  ClickUp task.
- Don't add AI attribution to commits, PRs or reviews (no `Co-Authored-By: Claude`, no "Generated
  with Claude Code").
- API changes go first: open the `laag-ta-bai-api` PR that updates `openapi.yaml`, then mirror it in
  `src/api/types.ts` and link both PRs. Don't put profile data in Supabase `user_metadata`; it
  belongs to the API (`PATCH /v1/me`).

## Design: build from Figma, not from the scaffold

Figma: <https://www.figma.com/design/IZksIsf3UEGbnocTt0oa9E/laagtabAI>. Build from **Final Pages**
and **Components**; tokens are on **Foundations**. Everything you need is summarised in
**[docs/design-system.md](docs/design-system.md)**: read it before any UI work.

- The maroon / gold scaffold colours (`bg`, `fg`, `surface`, `primary`, `maroon`, `gold`, `amber`,
  ...) and `lucide-react` icons are **placeholders**. New and migrated UI uses the Ivory + Sage
  tokens (`ivory`, `ivory-surface`, `navy`, `ink-*`, `sage-*`, `terracotta-*`, ...) and Ionicons
  from `src/components/icons/ionicons.tsx`.
- Only use colours from tokens. No raw hex in components; if Figma has a colour with no token,
  ask before adding one, and add it to both themes in `src/styles/index.css` and to the doc.
- Don't create parallel palettes (`--artifact-*`, `--color-design-*`, ...). One token set, defined
  once in `src/styles/index.css`.
- Figma has no dark mode yet; the dark values in `index.css` are provisional and every screen must
  still work in both themes (`data-theme` on `<html>`, see `usePreferences().resolvedTheme`).
- Match Figma specs exactly (sizes, radius, spacing, type). The component specs on the Components
  page are written rules, not suggestions.

### Reading Figma precisely

In Chrome, signed in, the Figma file exposes the plugin API in the page console. Use **read-only**
calls to get exact values instead of eyeballing screenshots:

```js
await figma.variables.getLocalVariableCollectionsAsync()   // colour / space / radius / size tokens
await figma.getLocalTextStylesAsync()                       // type scale
const node = await figma.getNodeByIdAsync('151:122')        // node id from the URL (151-122)
await node.exportAsync({ format: 'SVG_STRING' })            // icons and vectors
```

Never write to the Figma file from a script.

## Project rules (SRS)

- Portrait, mobile-first layout (max width `max-w-md`); test at 320 px and 360–390 px wide.
- Touch targets at least **48 × 48 px**, even if a ticket or Figma says 44.
- Text in `rem` (Tailwind sizes, or `text-[1.25rem]`), never fixed `px`, so it follows the OS font
  size. Check with a larger root font size.
- WCAG AA contrast in light and dark. State is never shown by colour alone.
- Every icon-only control has an accessible name; decorative icons get `aria-hidden`.
- Location is requested only after the in-app rationale, and coordinates are sent to the API for
  distance sorting and scan verification. Privacy copy must say exactly that.
- Keep the PWA precache small: compress images (WebP, under 250 KB) and exclude large decorative
  images in `vite.config.ts`.
- `localStorage` goes through `src/lib/storage.ts` (`laagtabai:` prefix, never throws).

## Adding a screen or component

1. Find the frame in Figma → Final Pages and the components it uses on the Components page.
2. Confirm the API endpoint exists (`src/api/types.ts`), or do the API PR first.
3. Build components in `src/components/`, pages in `src/pages/`, and register the route in
   `src/routes.tsx` (lazy-loaded). Tab-level screens go inside `AppShell` (they get the bottom
   nav); pushed screens go outside it.
4. Add a test next to the file (`*.test.tsx`; use `renderRoutes` / `mockFetch` from
   `src/test/render.tsx`).
5. Check it in the browser in light and dark, at 320 px and 390 px, then open the PR with
   screenshots.
