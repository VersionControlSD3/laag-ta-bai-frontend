# Contributing

1. Read [docs/branching.md](docs/branching.md). Branch from `develop`: `feature/<name>` or `fix/<name>`.
2. `npm ci`, `cp .env.example .env.local`, then run the API (`laag-ta-bai-api`, `npm run dev`) and `npm run dev` here.
3. Before pushing: `npm run lint && npm test && npm run build`.
4. Need an API change? Open the API PR first (it updates `openapi.yaml`), then update
   `src/api/types.ts` here and link both PRs.
5. UI rules from the SRS: portrait mobile layout, 48×48 touch targets, works in light and dark
   themes, text scales with OS font size.
6. Open a PR into `develop` using the template. CI must be green and one teammate must approve.

Never commit `.env*` files, keys, tokens or passwords. `VITE_` variables are public.
