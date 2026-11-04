# Changelog

Tipid uses [semantic versioning](https://semver.org): **MAJOR.MINOR.PATCH**
- **PATCH** (1.4.**1**) — bug fixes
- **MINOR** (1.**5**.0) — new features
- **MAJOR** (**2**.0.0) — big changes (e.g. data that needs migrating)

Release: update `src/lib/changelog.ts` + this file, then `npm version minor` (or `patch`) and push with tags.

## 1.5.0 — 2026-11-04 · Add new names on the spot
- Add screen: "+ New category", "+ New source" (income that varies) and "+ New person" without leaving the screen (owner/adults)
- Icon guessed from the category name

## 1.4.3 — 2026-11-04 · iPhone bottom menu fix
- iOS status bar style `black` (was `black-translucent`): iOS 18 clipped the bottom of translucent home-screen apps by the status-bar height (iPhone 16 Pro). Reverted 1.4.2's screen-height stretch.
- Note: iOS applies the status bar style only when the app is added to the home screen — remove and re-add once.

## 1.4.2 — 2026-11-04 · iPhone bottom menu
- iOS home-screen apps report a layout height short by the status bar; the mobile shell and bottom sheets now use the measured screen height (`--app-h`, `src/lib/viewport.ts`)
- Display diagnostics line under Settings → About → What's new

## 1.4.1 — 2026-11-04 · Updates & iPhone fix
- Settings → About → "Check for updates" (clears offline cache and reloads the newest version)
- "New version available → Reload" now also clears the offline cache
- Fixed empty strip under the bottom menu in the iPhone home-screen app (shell pinned to screen edges)

## 1.4.0 — 2026-11-04 · Flexible income
- Income can be Fixed (salary) or Varies (business, projects); record money as it comes in, Tipid uses the last-3-month average
- App version in Settings and login screen, "What's new", and a notice when a new version is deployed
- DB: `supabase/migrations/20261104020000_variable_income.sql`

## 1.3.0 — 2026-11-04 · Smarter bills
- Changing bills (electricity, water) estimated from the last 3 months actually paid
- Late fees / penalties tracked separately

## 1.2.0 — 2026-11-04 · New look
- Minimalist line icons replace emojis; line-style app icon

## 1.1.0 — 2026-11-04 · Install on your phone
- PWA install (Android button, iPhone steps), offline shell
- Mobile: pinned bottom menu, iPhone status-bar spacing, no pinch zoom
- Fixes: sign-up goal save + rollback (`20261104010000_onboarding_fix.sql`), friendly auth errors

## 1.0.0 — 2026-11-04 · First release
- Onboarding, Home, Add, Bills, Goals with savings suggestions, Family & invites, Reports
- DB: `supabase/migrations/20261104000000_init.sql`
