# Tipid — Product Plan (v2, 2026-11-04)

> Family budgeting app. Core question: **"Does our income cover our expenses — and are we saving?"**

## Decisions (locked)

| Topic | Decision |
|---|---|
| Users | Family use for now (no subscriptions/payments) |
| Look & feel | GoTyme-style layout and color palette. Own name ("Tipid") and own logo — no GoTyme logo/assets |
| Kids | Members aged **15+** get their own login. Under 15 = "managed member" (no login, parent logs for them) |
| Privacy | All household members see all transactions |
| Language / currency | English, PHP (₱) only |
| Bank linking | None — manual entry only |
| Status thresholds | 🟢 expenses ≤ 80% of income (≥20% saved) · 🟡 80–100% · 🔴 > 100% |
| Location | `~/Projects/tipid` (separate from agency site) |

## Tech stack

- React + Vite + TypeScript + Tailwind
- Supabase: Auth, Postgres, Row Level Security (household isolation), Realtime (family sync)
- Recharts for charts
- PWA (installable on phone home screen)
- Cloudflare Pages hosting
- Local dev: Supabase via OrbStack Docker (`npx supabase start`)

## Onboarding (one question per screen)

1. Goal: Stop overspending / Build savings / Save for something specific / Pay off debt / Just track
2. Household: Just me / Me + partner / Me + partner + kids
3. Income + pay schedule (monthly / 15th & 30th / weekly). Partner income can be added here too
4. Fixed bills checklist (pre-filled, editable): Rent, Water, Electricity, Internet, Groceries — amount + due day
5. Emergency fund target (suggested: 3 × monthly fixed expenses)
6. Optional first savings goal (e.g. "New phone ₱25,000 by June")
7. Invite family (skippable)

→ Ends on the first verdict: "You have ₱X left each month (Y% savings rate)".

## Categories

- **Fixed**: Rent, Water, Electricity, Internet, Groceries (recurring, due date, paid/unpaid)
- **Emergency**: Medical, Repairs, etc. + emergency fund balance
- **Other** (flexible): Food out, Transport, Shopping, School, Load/Data, custom
- **Savings**: money moved into a goal or the emergency fund (counted as saved, not spent)

## Savings & Goals (new)

A goal = name, target amount, target date, amount saved so far, optional photo/emoji.

### Math
```
months_left      = months between today and target date
needed_per_month = (target − saved) / months_left
free_cash        = monthly income − fixed − average "Other" spending (last 3 months, or budget if new)
gap              = needed_per_month − free_cash_available_for_goals
```
(Emergency fund contributions are taken out first until the emergency target is reached.)

### Suggestions when there's a gap (shown as 3 options, user picks one)
1. **Spend less** — "Cut Food out by ₱1,200 and Shopping by ₱800 a month." Only flexible ("Other") categories, largest first, max ~30% cut each. Fixed bills are never suggested for cuts.
2. **Earn more** — "Add ₱2,000/month of income (sideline, overtime)."
3. **Wait longer** — "At your current savings of ₱3,000/month you'll reach it by **Sept 2027**."
4. (Combo) — e.g. cut ₱1,000 + move date 2 months.

When on track: "✅ Save ₱2,500/month and you'll have your phone by June."

### Monthly savings plan
- Home shows **"Save this month: ₱X"** = sum of goal contributions + emergency fund contribution.
- Tap "Add to savings" → choose goal → amount → done. Progress bar updates.

## Screens

| Screen | Content |
|---|---|
| Home | Big balance card "₱X left this month" + status pill · income vs expenses bar · "Save this month" · upcoming bills · recent transactions |
| ➕ Add | Number keypad → type (expense / income / savings) → category or goal → who → done |
| Bills | Fixed bills, due dates, paid/unpaid |
| Goals | Emergency fund + goals with progress bars, required monthly amount, suggestions |
| Family | Members, spending per member this month, invite |
| Reports | Monthly summary |

Mobile: bottom tabs **Home · Goals · ➕ · Family · Reports** (Bills reachable from Home).
Desktop: left sidebar, cards in 2–3 column grid.

## Summary report (monthly)

- Income vs expenses + verdict sentence
- Savings rate (%) and amount saved
- Fixed / Emergency / Other split (donut)
- Spending per family member
- vs last month
- Goal and emergency fund progress
- (Phase 3) PDF/CSV export

## Data model

```
households    (id, name, currency='PHP', pay_schedule, emergency_target, created_at)
members       (id, household_id, user_id NULL, name, role: owner|adult|teen|child, birth_year)
              -- user_id NULL = managed member (under 15)
invites       (id, household_id, email, token, role, expires_at, accepted_at)
incomes       (id, household_id, member_id, source, amount, frequency)
categories    (id, household_id, name, type: fixed|emergency|other, monthly_budget, due_day, icon)
goals         (id, household_id, name, target_amount, target_date, emoji, is_emergency_fund, archived)
transactions  (id, household_id, member_id, kind: expense|income|saving,
               category_id NULL, goal_id NULL, amount, date, note, created_by)
bill_payments (id, category_id, month, paid_at, transaction_id)
```
RLS: a user can read/write rows only where `household_id` belongs to a household they're a member of. Teens: can add transactions; only owner/adults can edit incomes, bills, goals, members.

## Phases

1. **MVP (solo)**: auth, onboarding, Home, Add, Bills, Goals + suggestions, basic monthly report
2. **Family**: invites, roles (adult/teen/managed child), per-member spending, realtime sync
3. **Polish**: PWA install, bill due reminders, PDF/CSV export, dark mode

## Palette (sampled from GoTyme screenshots, `docs/ref/` — not committed)

| Token | Hex | Use |
|---|---|---|
| bg | `#121512` | app background |
| surface / surface-2 | `#1E211E` / `#292C29` | cards / inputs |
| line | `#2C2F2C` | dividers |
| lime | `#9CE46C` | brand accent, primary buttons, "on track" |
| mint | `#E1F7F7` | chart accent |
| warn / danger | `#F5C451` / `#F26B6B` | tight / short |

Logo: simple wordmark `tipid.` with a lime dot. Font: Plus Jakarta Sans.

## Status

- [x] Phase 1 code written (all screens) + invites/join flow (phase 2 groundwork)
- [ ] Run against local Supabase and click-test every screen
- [ ] Create GitHub repo, hosted Supabase project, Cloudflare Pages project
