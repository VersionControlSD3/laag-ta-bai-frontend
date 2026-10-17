# CI/CD and deployment

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | PRs into `main`/`develop`, pushes to them, manual | `npm ci`, ESLint, typecheck + Vite build, Vitest |
| `.github/workflows/deploy.yml` | CI succeeded on a push to `develop` or `main`, or manual | Vercel build and deploy, then a smoke test of the home page |
| `.github/dependabot.yml` | Weekly / monthly | Dependency and Actions update PRs into `develop` |

CI mocks the API in tests and builds without Supabase values, so it needs **no secrets**.

## Deployment is off until you turn it on

`deploy.yml` only runs when the repository variable `DEPLOY_ENABLED` is `true`. Until then,
CI still runs and nothing is deployed.

| Branch | GitHub Environment | Vercel target |
|---|---|---|
| `develop` | `development` | Preview deployment (optionally aliased to a stable URL) |
| `main` | `production` | Production (`--prod`) |

## One-time setup

1. **Vercel project**: create a project for this repo (framework: Vite). In Project →
   Settings → Environment Variables set, for **Production** and **Preview** separately:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | The API URL for that environment (e.g. `https://laag-ta-bai-api.vercel.app`) |
   | `VITE_SUPABASE_URL` | Supabase project URL (dev project for Preview, prod project for Production) |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key. Public by design |
   | `VITE_GOOGLE_MAPS_API_KEY` | Optional until the map is built; restrict it by HTTP referrer |

   `VITE_` values are bundled into the browser app, so never put a secret in one.
   `vercel.json` disables Vercel's own Git auto-deploys so GitHub Actions is the only deployer.
2. **Supabase Auth URLs**: in each Supabase project → Authentication → URL Configuration, set the
   Site URL to that environment's frontend URL and add it to the redirect allow list.
3. **GitHub Environments**: Settings → Environments → create `development` and `production`.
   Add a required reviewer to `production`.
4. **Secrets** (add to each environment): `VERCEL_TOKEN` (Vercel → Account Settings → Tokens),
   `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (`.vercel/project.json` after `npx vercel link`).
   **Variables**: `DEPLOY_ENABLED=true` to turn deploys on; optional `VERCEL_DEV_ALIAS`
   (e.g. `laag-ta-bai-dev.vercel.app`) in `development`.
5. Push to `develop` and watch **Actions → Deploy**.

## Secrets policy

- Only placeholders live in `.env.example`. Real values go in `.env` (git-ignored), Vercel
  environment variables, or GitHub Secrets.
- Account logins (Gmail, Supabase, Vercel usernames and passwords) do not belong in any repo,
  `.env` file or GitHub Secret. Keep them in a password manager. Use access tokens for automation.
- If a secret is ever committed, rotate it immediately; deleting the commit is not enough.

## Rollback

- Vercel → Deployments → pick the last good production deployment → *Promote* (or
  *Instant Rollback*). Then revert the bad commit through a PR.
- Installed PWAs pick up the rollback on their next visit; the in-app "new version" prompt reloads them.

## Troubleshooting

- Reproduce CI locally: `npm ci && npm run lint && npm test && npm run build`.
- Deploy job skipped: check `DEPLOY_ENABLED` and that CI passed on a **push** (PRs don't deploy).
- Deploy job "Missing secret": the secret is missing from that GitHub Environment.
- 401 from preview smoke test: Vercel Deployment Protection is on; that step is non-blocking for previews.
