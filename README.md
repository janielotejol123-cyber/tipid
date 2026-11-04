# Tipid

Family budgeting app — *"Does our income cover our expenses, and are we saving?"*

React + Vite + TypeScript + Tailwind v4 · Supabase (Auth, Postgres + RLS, Realtime) · Cloudflare Pages

See [`docs/PLAN.md`](docs/PLAN.md) for the product plan.

## Run locally

Needs OrbStack (Docker) running.

```bash
npm install
npx supabase start          # local Supabase on ports 556xx (doesn't clash with other projects)
npx supabase status         # copy API URL + anon key into .env.local (see .env.example)
npm run dev                 # http://localhost:5180
```

Local email confirmation is off, so sign-up logs you straight in. Studio: http://127.0.0.1:55623

Reset the local DB (re-runs migrations): `npx supabase db reset`

## Deploy

**Supabase (hosted)**
1. Create a project at supabase.com.
2. `npx supabase link --project-ref <ref>` then `npx supabase db push` to apply `supabase/migrations`.
3. Auth → URL Configuration: set Site URL to your Cloudflare Pages URL and add it to Redirect URLs.

**Cloudflare Pages** (connect the GitHub repo)
- Build command: `npm run build` · Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from Supabase → Project Settings → API)
- `public/_redirects` handles SPA routing.

## Structure

```
src/lib/budget.ts     all budget math (status, safe-to-spend, savings plan & suggestions)
src/lib/household.tsx loads household data + realtime family sync
src/pages/            Login, Onboarding, Home, Add, Bills, Goals, Family, Reports, Settings, Join
supabase/migrations/  schema + row level security
```

## Versioning & releases

Semantic versioning (`MAJOR.MINOR.PATCH`), version lives in `package.json`. See [`CHANGELOG.md`](CHANGELOG.md).

1. Add the release notes to `src/lib/changelog.ts` (shown in the app under Settings → About → What's new) and `CHANGELOG.md`.
2. `npm version minor` (new features) or `npm version patch` (fixes) — bumps `package.json`, commits and creates a `vX.Y.Z` tag.
3. `git push --follow-tags` — Cloudflare deploys; open apps show "New version available".

The build writes `/version.json` (version, commit, build date). The app checks it when opened/foregrounded and every 30 minutes.
