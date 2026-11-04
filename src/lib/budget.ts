/**
 * Tipid budget math. Pure functions only — no React, no Supabase.
 *
 * Status thresholds (agreed): spending ≤ 80% of income = ok (≥20% left to save),
 * 80–100% = tight, > 100% = short.
 */
import { addMonths, monthStart, sameMonth, toMonthly, ymd } from './money'
import type { BillPayment, Category, Goal, Household, Income, Member, Scope, Transaction } from './types'

export interface Snapshot {
  household: Household
  members: Member[]
  incomes: Income[]
  categories: Category[]
  goals: Goal[]
  transactions: Transaction[]
  billPayments: BillPayment[]
}

export type Status = 'ok' | 'tight' | 'short'

// ───────────────────────── Family / Business views ─────────────────────────

export type ReportView = 'all' | Scope

export const hasBusiness = (s: Snapshot) =>
  s.incomes.some((i) => i.scope === 'business') || s.categories.some((c) => c.scope === 'business')

/** Only exists inside the Business view, so transfers get their own line there. Archived keeps it out of bills and budgets. */
const TRANSFER_CATEGORY: Omit<Category, 'household_id'> = {
  id: 'transfer-to-family', name: 'Transfer to family', type: 'other', monthly_budget: 0,
  due_day: null, icon: 'family', archived: true, scope: 'business',
}

/**
 * The snapshot one report view works from, so all the month and year math stays the same.
 * All: transfers count as nothing, because the money stayed in the household.
 * Family: a transfer is money in. Business: a transfer is money out.
 * That keeps Family left over + Business left over = All left over.
 * Savings go to family goals, so they stay on the Family side.
 */
export function scopedSnapshot(s: Snapshot, view: ReportView): Snapshot {
  if (view === 'all') return s
  const inView = (x: { scope?: Scope }) => (x.scope ?? 'family') === view
  const incomes = s.incomes.filter(inView)
  const categories = s.categories.filter(inView)
  const incomeIds = new Set(incomes.map((i) => i.id))
  const categoryIds = new Set(categories.map((c) => c.id))
  const transactions = s.transactions.flatMap((t): Transaction[] => {
    if (t.kind === 'transfer') {
      return [view === 'family'
        ? { ...t, kind: 'income', transferred: true }
        : { ...t, kind: 'expense', category_id: TRANSFER_CATEGORY.id, transferred: true }]
    }
    if (t.kind === 'income') {
      const own = t.income_id && s.incomes.some((i) => i.id === t.income_id) ? incomeIds.has(t.income_id) : view === 'family'
      return own ? [t] : []
    }
    if (t.kind === 'expense') {
      const own = t.category_id && s.categories.some((c) => c.id === t.category_id) ? categoryIds.has(t.category_id) : view === 'family'
      return own ? [t] : []
    }
    return view === 'family' ? [t] : []
  })
  return {
    ...s, incomes, transactions,
    categories: view === 'business' ? [...categories, { ...TRANSFER_CATEGORY, household_id: s.household.id }] : categories,
  }
}

export const OK_RATIO = 0.8
export const statusFor = (spending: number, income: number): Status => {
  if (income <= 0) return spending > 0 ? 'short' : 'ok'
  const r = spending / income
  return r <= OK_RATIO ? 'ok' : r <= 1 ? 'tight' : 'short'
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + Number(b), 0)

/** Regular (fixed) income per month — salaries etc. */
export const fixedMonthlyIncome = (incomes: Income[]) =>
  sum(incomes.filter((i) => i.frequency !== 'variable').map((i) => toMonthly(Number(i.amount), i.frequency)))

export interface IncomeEstimate { amount: number; learned: boolean; low: number; high: number; months: number }

/**
 * Typical month for a 'varies' income (business, projects): average received over the last 3 months.
 * Falls back to the typical amount the user entered until there's history.
 */
export function incomeEstimate(i: Income, s: Snapshot, month: Date): IncomeEstimate {
  const start = ymd(addMonths(monthStart(month), -3))
  const end = ymd(monthStart(month))
  const perMonth = new Map<string, number>()
  for (const t of s.transactions) {
    if (t.kind !== 'income' || t.income_id !== i.id || t.date < start || t.date >= end) continue
    perMonth.set(t.date.slice(0, 7), (perMonth.get(t.date.slice(0, 7)) ?? 0) + Number(t.amount))
  }
  const vals = [...perMonth.values()]
  if (!vals.length) return { amount: Number(i.amount), learned: false, low: Number(i.amount), high: Number(i.amount), months: 0 }
  // months with nothing received count as ₱0 once the source has history
  const months = Math.max(vals.length, Math.min(3, monthsOfHistory(s, i, start, month)))
  const avg = sum(vals) / months
  return { amount: Math.round(avg), learned: true, low: months > vals.length ? 0 : Math.min(...vals), high: Math.max(...vals), months }
}

/** How many of the last 3 months this income source existed for */
function monthsOfHistory(s: Snapshot, i: Income, start: string, month: Date) {
  const first = s.transactions.filter((t) => t.income_id === i.id).map((t) => t.date).sort()[0]
  if (!first) return 0
  const from = first > start ? first : start
  const a = new Date(from + 'T00:00:00'), b = monthStart(month)
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth())
}

/** Expected income for a month: fixed income + typical month of each 'varies' source */
export const expectedMonthlyIncome = (s: Snapshot, month: Date) =>
  fixedMonthlyIncome(s.incomes) + sum(s.incomes.filter((i) => i.frequency === 'variable').map((i) => incomeEstimate(i, s, month).amount))

export const goalSaved = (goalId: string, txs: Transaction[]) =>
  sum(txs.filter((t) => t.kind === 'saving' && t.goal_id === goalId).map((t) => t.amount))

const activeCats = (s: Snapshot, type?: Category['type']) =>
  s.categories.filter((c) => !c.archived && (!type || c.type === type))

// ───────────────────────── Bills that change & late fees ─────────────────────────

/** Late fees / penalties are saved as their own expense with this note, in the bill's category. */
export const LATE_FEE = 'Late fee'
export const isLateFee = (t: Transaction) => t.kind === 'expense' && t.note === LATE_FEE

export interface BillEstimate {
  /** What to expect this month */
  amount: number
  /** true when it's based on what was actually paid (not just the typed budget) */
  learned: boolean
  /** true when past amounts differ month to month (electricity, water…) */
  varies: boolean
  /** lowest–highest actually paid in the months used */
  low: number
  high: number
}

/**
 * Expected amount for a fixed bill: the average actually paid over the last 3 months
 * (late fees excluded). Falls back to the bill's usual amount when there's no history yet.
 */
export function billEstimate(c: Category, s: Snapshot, month: Date): BillEstimate {
  const start = ymd(addMonths(monthStart(month), -3))
  const end = ymd(monthStart(month))
  const perMonth = new Map<string, number>()
  for (const t of s.transactions) {
    if (t.kind !== 'expense' || t.category_id !== c.id || isLateFee(t) || t.date < start || t.date >= end) continue
    perMonth.set(t.date.slice(0, 7), (perMonth.get(t.date.slice(0, 7)) ?? 0) + Number(t.amount))
  }
  const vals = [...perMonth.values()]
  if (!vals.length) return { amount: c.monthly_budget, learned: false, varies: false, low: c.monthly_budget, high: c.monthly_budget }
  const low = Math.min(...vals), high = Math.max(...vals)
  return { amount: Math.round(sum(vals) / vals.length), learned: true, varies: high - low >= 1, low, high }
}

// ───────────────────────── Month summary (what happened) ─────────────────────────

export interface MonthSummary {
  month: Date
  plannedIncome: number
  extraIncome: number
  /** business / project money received this month */
  variableReceived: number
  /** typical month for business / project income */
  variableExpected: number
  /** true while this month is still running and business income may still come in */
  incomePending: boolean
  income: number
  spent: number
  saved: number
  byType: Record<Category['type'] | 'uncategorized', number>
  byCategory: { category: Category | null; amount: number }[]
  byMember: { member: Member | null; amount: number }[]
  unpaidBills: Category[]
  unpaidTotal: number
  /** expected amount per fixed bill this month */
  estimates: Map<string, BillEstimate>
  lateFees: number
  status: Status
  /** spent + unpaid bills, as share of income */
  ratio: number
}

export function monthSummary(s: Snapshot, month: Date): MonthSummary {
  const txs = s.transactions.filter((t) => sameMonth(t.date, month))
  const expenses = txs.filter((t) => t.kind === 'expense')
  const plannedIncome = fixedMonthlyIncome(s.incomes)
  const incomeTx = txs.filter((t) => t.kind === 'income')
  const extraIncome = sum(incomeTx.filter((t) => !t.income_id).map((t) => t.amount))
  const variableReceived = sum(incomeTx.filter((t) => t.income_id).map((t) => t.amount))
  const variableExpected = sum(s.incomes.filter((i) => i.frequency === 'variable').map((i) => incomeEstimate(i, s, month).amount))
  // Current month: count the expected business income until the real amount passes it. Past months: what actually came in.
  const isCurrent = ymd(monthStart(month)) === ymd(monthStart(new Date()))
  const incomePending = isCurrent && variableReceived < variableExpected
  const income = plannedIncome + extraIncome + (isCurrent ? Math.max(variableReceived, variableExpected) : variableReceived)
  const spent = sum(expenses.map((t) => t.amount))
  const saved = sum(txs.filter((t) => t.kind === 'saving').map((t) => t.amount))

  const catById = new Map(s.categories.map((c) => [c.id, c]))
  const byType = { fixed: 0, emergency: 0, other: 0, uncategorized: 0 }
  const catTotals = new Map<string | null, number>()
  const memTotals = new Map<string | null, number>()
  for (const t of expenses) {
    const c = t.category_id ? catById.get(t.category_id) : undefined
    byType[c ? c.type : 'uncategorized'] += Number(t.amount)
    catTotals.set(c?.id ?? null, (catTotals.get(c?.id ?? null) ?? 0) + Number(t.amount))
    memTotals.set(t.member_id, (memTotals.get(t.member_id) ?? 0) + Number(t.amount))
  }

  const monthKey = ymd(monthStart(month))
  const paid = new Set(s.billPayments.filter((b) => b.month === monthKey).map((b) => b.category_id))
  const estimates = new Map(activeCats(s, 'fixed').map((c) => [c.id, billEstimate(c, s, month)]))
  const unpaidBills = activeCats(s, 'fixed')
    .filter((c) => !paid.has(c.id) && (estimates.get(c.id)?.amount ?? 0) > 0)
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))
  const unpaidTotal = sum(unpaidBills.map((c) => estimates.get(c.id)!.amount))
  const lateFees = sum(expenses.filter(isLateFee).map((t) => t.amount))

  const committed = spent + unpaidTotal
  return {
    month,
    plannedIncome,
    extraIncome,
    variableReceived,
    variableExpected,
    incomePending,
    income,
    spent,
    saved,
    byType,
    byCategory: [...catTotals].map(([id, amount]) => ({ category: id ? catById.get(id) ?? null : null, amount }))
      .sort((a, b) => b.amount - a.amount),
    byMember: [...memTotals].map(([id, amount]) => ({ member: s.members.find((m) => m.id === id) ?? null, amount }))
      .sort((a, b) => b.amount - a.amount),
    unpaidBills,
    unpaidTotal,
    estimates,
    lateFees,
    status: statusFor(committed, income),
    ratio: income > 0 ? committed / income : committed > 0 ? Infinity : 0,
  }
}

export interface YearSummary {
  year: number
  /** months that have at least one record and aren't in the future */
  monthsCounted: number
  /** money that actually arrived, plus fixed salaries for the counted months; never an estimate */
  income: number
  /** the fixed-salary part of income; these have no transactions to list */
  fixedIncome: number
  spent: number
  saved: number
  months: { month: Date; income: number; spent: number; saved: number }[]
}

/** Whole-year totals, built from the same month figures the rest of Reports uses. */
export function yearSummary(s: Snapshot, year: number): YearSummary {
  const now = new Date()
  const summaries = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
    .filter((d) => d <= now && s.transactions.some((t) => sameMonth(t.date, d)))
    .map((d) => monthSummary(s, d))
  const months = summaries.map((m) => ({
    month: m.month, spent: m.spent, saved: m.saved,
    income: m.plannedIncome + m.variableReceived + m.extraIncome,
  }))
  return {
    year,
    monthsCounted: months.length,
    income: sum(months.map((m) => m.income)),
    fixedIncome: sum(summaries.map((m) => m.plannedIncome)),
    spent: sum(months.map((m) => m.spent)),
    saved: sum(months.map((m) => m.saved)),
    months,
  }
}

// ───────────────────────── Savings plan (what to do) ─────────────────────────

export interface Cut { category: Category; current: number; cut: number }

export interface GoalPlan {
  goal: Goal
  saved: number
  remaining: number
  progress: number          // 0..1
  monthsLeft: number | null // null = no target date
  needed: number | null     // per month to hit the date
  allocated: number         // what the budget can actually give per month
  gap: number               // needed − allocated (0 = on track)
  done: boolean
  /** Suggestions when gap > 0 */
  cuts: Cut[]
  cutsCover: boolean        // do the cuts alone close the gap?
  earnMore: number
  reachBy: Date | null      // at `allocated`/month
}

export interface Plan {
  income: number
  fixed: number
  emergencyBudget: number
  otherSpend: number        // average actual (last 3 months) or budget if no history
  otherByCategory: { category: Category; amount: number }[]
  free: number              // income − fixed − emergency − other
  emergency: GoalPlan | null
  goals: GoalPlan[]
  saveThisMonth: number
  savedThisMonth: number
  savingsRate: number       // planned savings ÷ income
}

const monthsBetween = (from: Date, toIso: string) => {
  const to = new Date(toIso + 'T00:00:00')
  const m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return Math.max(1, m)
}

/** Average monthly spend per "other" category over the last 3 full months that have data. */
function averageOther(s: Snapshot, today: Date) {
  const cats = activeCats(s, 'other')
  const start = addMonths(monthStart(today), -3)
  const end = monthStart(today)
  // Only expenses count as spending history (savings/income don't)
  const hist = s.transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00')
    return t.kind === 'expense' && d >= start && d < end
  })
  const monthsWithData = new Set(hist.map((t) => t.date.slice(0, 7))).size
  return cats.map((c) => {
    const total = sum(hist.filter((t) => t.kind === 'expense' && t.category_id === c.id).map((t) => t.amount))
    return { category: c, amount: monthsWithData > 0 ? total / monthsWithData : Number(c.monthly_budget) }
  })
}

function suggestCuts(other: { category: Category; amount: number }[], gap: number) {
  const cuts: Cut[] = []
  let left = gap
  for (const o of [...other].sort((a, b) => b.amount - a.amount)) {
    if (left <= 0) break
    const max = Math.floor((o.amount * 0.3) / 50) * 50 // max 30%, rounded to ₱50
    if (max <= 0) continue
    const cut = Math.min(max, Math.ceil(left / 50) * 50)
    cuts.push({ category: o.category, current: o.amount, cut })
    left -= cut
  }
  return { cuts, cover: left <= 0 }
}

function planGoal(goal: Goal, s: Snapshot, today: Date, available: number,
  other: { category: Category; amount: number }[], defaultMonths: number | null): GoalPlan {
  const saved = goalSaved(goal.id, s.transactions)
  const remaining = Math.max(0, goal.target_amount - saved)
  const done = remaining <= 0
  const monthsLeft = goal.target_date ? monthsBetween(today, goal.target_date) : defaultMonths
  const needed = done ? 0 : monthsLeft ? Math.ceil(remaining / monthsLeft) : null
  const pool = Math.max(0, Math.floor(available))
  const allocated = done ? 0 : needed !== null ? Math.min(needed, pool) : Math.min(remaining, pool)
  const gap = needed !== null ? Math.max(0, Math.ceil(needed - allocated)) : 0
  const { cuts, cover } = gap > 0 ? suggestCuts(other, gap) : { cuts: [], cover: true }
  const reachMonths = allocated > 0 ? Math.ceil(remaining / allocated) : null
  return {
    goal, saved, remaining, done,
    progress: Math.min(1, saved / goal.target_amount),
    monthsLeft, needed, allocated, gap, cuts, cutsCover: cover,
    earnMore: gap,
    reachBy: done ? null : reachMonths ? addMonths(today, reachMonths) : null,
  }
}

export function buildPlan(s: Snapshot, today = new Date()): Plan {
  const income = expectedMonthlyIncome(s, today)
  const fixed = sum(activeCats(s, 'fixed').map((c) => billEstimate(c, s, today).amount))
  const emergencyBudget = sum(activeCats(s, 'emergency').map((c) => c.monthly_budget))
  const otherByCategory = averageOther(s, today)
  const otherSpend = sum(otherByCategory.map((o) => o.amount))
  const free = income - fixed - emergencyBudget - otherSpend

  let available = free
  // 1) Emergency fund first (default: build it within 12 months)
  const efGoal = s.goals.find((g) => g.is_emergency_fund && !g.archived) ?? null
  const emergency = efGoal ? planGoal(efGoal, s, today, available, otherByCategory, 12) : null
  if (emergency) available -= emergency.allocated

  // 2) Other goals, earliest target date first; undated goals share what's left
  const goals = s.goals.filter((g) => !g.is_emergency_fund && !g.archived)
    .sort((a, b) => (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999'))
  const plans: GoalPlan[] = []
  const undated = goals.filter((g) => !g.target_date)
  for (const g of goals.filter((g) => g.target_date)) {
    const p = planGoal(g, s, today, available, otherByCategory, null)
    available -= p.allocated
    plans.push(p)
  }
  const share = undated.length ? Math.max(0, available) / undated.length : 0
  for (const g of undated) plans.push(planGoal(g, s, today, share, otherByCategory, null))

  const saveThisMonth = (emergency?.allocated ?? 0) + sum(plans.map((p) => p.allocated))
  const savedThisMonth = sum(s.transactions.filter((t) => t.kind === 'saving' && sameMonth(t.date, today)).map((t) => t.amount))
  return {
    income, fixed, emergencyBudget, otherSpend, otherByCategory, free,
    emergency, goals: plans, saveThisMonth, savedThisMonth,
    savingsRate: income > 0 ? saveThisMonth / income : 0,
  }
}

/** "Safe to spend" for the current month: income minus what's spent, what's still due, and what you plan to save. */
export const safeToSpend = (m: MonthSummary, p: Plan) =>
  m.income - m.spent - m.unpaidTotal - Math.max(p.saveThisMonth, m.saved)

export const statusCopy: Record<Status, { label: string; tone: string }> = {
  ok: { label: 'On track', tone: 'text-lime bg-lime/10' },
  tight: { label: 'Tight', tone: 'text-warn bg-warn/10' },
  short: { label: 'Short', tone: 'text-danger bg-danger/10' },
}
