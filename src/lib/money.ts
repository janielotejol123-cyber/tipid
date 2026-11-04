import type { IncomeFrequency, PaySchedule } from './types'

const fmt0 = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const fmt2 = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ₱12,345 (whole pesos unless there are centavos) */
export const peso = (n: number) => (Math.round(n * 100) % 100 === 0 ? fmt0 : fmt2).format(n)

/** Convert a per-pay-period amount to a monthly amount */
export const toMonthly = (amount: number, freq: IncomeFrequency) =>
  freq === 'weekly' ? (amount * 52) / 12 : freq === 'semi_monthly' ? amount * 2 : amount

export const payLabel: Record<PaySchedule, string> = {
  monthly: 'Monthly',
  semi_monthly: 'Twice a month (15th & 30th)',
  weekly: 'Weekly',
}

// ── Dates (always local, YYYY-MM-DD) ──
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const sameMonth = (iso: string, d: Date) => iso.slice(0, 7) === ymd(d).slice(0, 7)
export const monthName = (d: Date, long = true) =>
  d.toLocaleDateString('en-PH', { month: long ? 'long' : 'short', year: 'numeric' })
export const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

/** 1st, 2nd, 3rd, 4th … */
export const ord = (d: number) =>
  d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th')
