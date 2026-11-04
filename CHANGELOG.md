# Changelog

Tipid uses [semantic versioning](https://semver.org): **MAJOR.MINOR.PATCH**
- **PATCH** (1.4.**1**) — bug fixes
- **MINOR** (1.**5**.0) — new features
- **MAJOR** (**2**.0.0) — big changes (e.g. data that needs migrating)

Release: update `src/lib/changelog.ts` + this file, then `npm version minor` (or `patch`) and push with tags.

## 1.8.0 — 2026-11-05 · Family and Business money
- Migration `20261105000000_family_business_split.sql`: `scope` on incomes and categories, `transfer` transaction kind. Must be applied before this version deploys.
- `scopedSnapshot` in `src/lib/budget.ts`: Reports work from a filtered snapshot, so month and year math is unchanged. Family + Business left over always equals All.
- Transfers count as nothing in All, income in Family, money out in Business
- Family / Business choice in the income and category forms; switch in Reports and Transfer tab in Add appear only once something is labelled Business
- Home and Goals still use all money combined

## 1.7.1 — 2026-11-05 · Phone layout fix
- Home and Goals: `grid-cols-1` on the mobile grid. Without it the implicit column grew to fit long `truncate` text, so the page scrolled sideways.
- Reports: monthly verdict is `text-sm text-muted`, so the amounts lead. "Where the money went" wraps on very narrow phones.
- `StatusPill` never wraps

## 1.7.0 — 2026-11-05 · Password tools and a clearer Settings
- Show/hide eye on password fields (`src/components/PasswordField.tsx`); Edge's built-in reveal button hidden so there is only one
- Change password: checks the current password, sets the new one (8 characters minimum), then signs out other devices with `signOut({ scope: 'others' })` (`src/components/ChangePassword.tsx`)
- Forgot password: reset link from the login screen, same reply whether or not the email has an account, expired-link message, new-password screen after the link (`src/pages/ResetPassword.tsx`, `recovering` in `src/lib/auth.tsx`)
- Money settings moved to Budget setup at `/budget` (`src/pages/Budget.tsx`); Settings at `/settings` now holds account, install, about and sign out
- Note: reset emails depend on the Supabase email sender and its Redirect URLs including the live address

## 1.6.0 — 2026-11-04 · Weekly, monthly and yearly reports
- Reports: Weekly (Monday to Sunday), Monthly and Yearly tabs that stay near the same date when switching (`src/components/ReportViews.tsx`)
- Yearly: totals from actual records only, month by month chart, income by source, spending by category (`yearSummary` in `src/lib/budget.ts`)
- Income received section, and tap-to-expand income sources and spending categories with entry and piece counts
- Income entries with a source now show their note
- App loads 24 months of history (was 13) so last year's totals stay complete

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
