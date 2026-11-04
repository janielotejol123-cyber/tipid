import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Glyph from './Glyph'
import TxRow from './TxRow'
import { IconBack, IconChevron } from './icons'
import { Empty } from './ui'
import { yearSummary } from '../lib/budget'
import type { Snapshot } from '../lib/budget'
import { HISTORY_MONTHS, useData } from '../lib/household'
import { addDays, peso, shortDate, weekStart, ymd } from '../lib/money'
import type { Transaction } from '../lib/types'

type Open = (t: Transaction) => void

/** Pieces are kept in the note for now ("… · 150 pcs"); a real quantity column would replace this. */
export const countPcs = (rows: Transaction[]) =>
  rows.reduce((a, t) => a + Number(t.note?.match(/([\d,]+) pcs/)?.[1].replaceAll(',', '') ?? 0), 0)

const total = (rows: Transaction[], kind: Transaction['kind']) =>
  rows.filter((t) => t.kind === kind).reduce((a, t) => a + t.amount, 0)

const entryLine = (rows: Transaction[]) => {
  const pcs = countPcs(rows)
  return `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}${pcs > 0 ? ` · ${pcs.toLocaleString('en-PH')} pcs` : ''}`
}

export function Kpi({ k, v, sub, tone = '', subTone = 'text-muted' }: { k: string; v: string; sub?: string; tone?: string; subTone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{k}</p>
      <p className={`text-xl font-extrabold ${tone}`}>{v}</p>
      {sub && <p className={`text-xs ${subTone}`}>{sub}</p>}
    </div>
  )
}

export function PeriodStepper({ label, prevLabel, nextLabel, onPrev, onNext, atEnd }: {
  label: string; prevLabel: string; nextLabel: string; onPrev: () => void; onNext: () => void; atEnd: boolean
}) {
  return (
    <div className="flex items-center justify-between card !py-3 !px-3 mb-5">
      <button className="size-10 rounded-full bg-surface-2 flex items-center justify-center" onClick={onPrev} aria-label={prevLabel}><IconBack /></button>
      <span className="font-bold">{label}</span>
      <button className="size-10 rounded-full bg-surface-2 flex items-center justify-center disabled:opacity-30" disabled={atEnd} onClick={onNext} aria-label={nextLabel}><IconChevron /></button>
    </div>
  )
}

/** Money received in a period, grouped by source. Tap a source to see its entries. */
export function IncomeBySource({ rows, data, onOpen, fixedIncome = 0 }: { rows: Transaction[]; data: Snapshot; onOpen: Open; fixedIncome?: number }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const incomeTxs = rows.filter((t) => t.kind === 'income')
  const byMember = [...new Set(incomeTxs.map((t) => t.member_id))].map((id) => ({
    id,
    name: data.members.find((x) => x.id === id)?.name ?? 'Not assigned',
    amount: incomeTxs.filter((t) => t.member_id === id).reduce((a, t) => a + t.amount, 0),
  })).sort((a, b) => b.amount - a.amount)
  const groups = [...new Set(incomeTxs.map((t) => t.income_id ?? 'other'))].map((key) => {
    const list = incomeTxs.filter((t) => (t.income_id ?? 'other') === key)
    return {
      key, list,
      name: data.incomes.find((i) => i.id === key)?.source ?? 'Bonus / other',
      amount: list.reduce((a, t) => a + t.amount, 0),
    }
  }).sort((a, b) => b.amount - a.amount)

  return (
    <section className="card md:col-span-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">Income received</h2>
        <span className="text-xl font-extrabold text-lime">{peso(Math.round(total(rows, 'income')))}</span>
      </div>
      {byMember.length > 0 && <p className="text-sm text-muted mt-1">{byMember.map((r) => `${r.name} ${peso(r.amount)}`).join(' · ')}</p>}
      {fixedIncome > 0 && <p className="text-xs text-muted mt-1">Fixed salaries of {peso(Math.round(fixedIncome))} are counted automatically and not listed here.</p>}
      {groups.length === 0
        ? <p className="text-sm text-muted mt-3">No income recorded for this period yet.</p>
        : (
          <ul className="divide-y divide-line mt-2">
            {groups.map((g) => {
              const expanded = openKey === g.key
              return (
                <li key={g.key} className="py-1">
                  <button className="w-full flex items-center gap-2 py-2 text-left" aria-expanded={expanded} onClick={() => setOpenKey(expanded ? null : g.key)}>
                    <IconChevron size={14} className={`text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{g.name}</span>
                      <span className="block text-xs text-muted">{entryLine(g.list)}</span>
                    </span>
                    <span className="font-bold whitespace-nowrap text-lime">+ {peso(g.amount)}</span>
                  </button>
                  {expanded && <div className="divide-y divide-line">{g.list.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => onOpen(t)} />)}</div>}
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}

/** Spending in a period, grouped by category. Tap a category to see its payments. */
function SpentByCategory({ rows, data, onOpen }: { rows: Transaction[]; data: Snapshot; onOpen: Open }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const expenses = rows.filter((t) => t.kind === 'expense')
  const groups = [...new Set(expenses.map((t) => t.category_id ?? 'none'))].map((key) => {
    const list = expenses.filter((t) => (t.category_id ?? 'none') === key)
    return { key, list, category: data.categories.find((c) => c.id === key) ?? null, amount: list.reduce((a, t) => a + t.amount, 0) }
  }).sort((a, b) => b.amount - a.amount)

  return (
    <section className="card md:col-span-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">Spent by category</h2>
        <span className="text-xl font-extrabold">{peso(Math.round(total(rows, 'expense')))}</span>
      </div>
      {groups.length === 0
        ? <p className="text-sm text-muted mt-3">No expenses recorded for this period.</p>
        : (
          <ul className="divide-y divide-line mt-2">
            {groups.map((g) => {
              const expanded = openKey === g.key
              return (
                <li key={g.key} className="py-1">
                  <button className="w-full flex items-center gap-2 py-2 text-left" aria-expanded={expanded} onClick={() => setOpenKey(expanded ? null : g.key)}>
                    <IconChevron size={14} className={`text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    <Glyph name={g.category?.icon} size={16} className="text-muted shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{g.category?.name ?? 'Uncategorized'}</span>
                      <span className="block text-xs text-muted">{entryLine(g.list)}</span>
                    </span>
                    <span className="font-bold whitespace-nowrap">{peso(g.amount)}</span>
                  </button>
                  {expanded && <div className="divide-y divide-line">{g.list.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => onOpen(t)} />)}</div>}
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}

function Totals({ income, spent, saved }: { income: number; spent: number; saved: number }) {
  const left = income - spent - saved
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Kpi k="Income" v={peso(Math.round(income))} />
      <Kpi k="Spent" v={peso(Math.round(spent))} />
      <Kpi k="Saved" v={peso(Math.round(saved))} />
      <Kpi k="Left over" v={peso(Math.round(left))} tone={left < 0 ? 'text-danger' : ''} />
    </div>
  )
}

export function WeekReport({ anchor, onAnchor, onOpen }: { anchor: Date; onAnchor: (d: Date) => void; onOpen: Open }) {
  const { data } = useData()
  const start = weekStart(anchor)
  const end = addDays(start, 6)
  const from = ymd(start)
  const to = ymd(end)
  const rows = useMemo(() => data.transactions.filter((t) => t.date >= from && t.date <= to), [data, from, to])
  return (
    <div>
      <PeriodStepper label={`${shortDate(from)} to ${shortDate(to)}`} prevLabel="Previous week" nextLabel="Next week"
        onPrev={() => onAnchor(addDays(start, -7))} onNext={() => onAnchor(addDays(start, 7))} atEnd={addDays(start, 7) > new Date()} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card md:col-span-2">
          <Totals income={total(rows, 'income')} spent={total(rows, 'expense')} saved={total(rows, 'saving')} />
          <p className="text-xs text-muted mt-3">Only entries dated this week, Monday to Sunday. Fixed salaries are not included.</p>
        </section>
        {rows.length === 0
          ? <section className="card md:col-span-2"><Empty icon="receipt" title="Nothing recorded this week" /></section>
          : (
            <>
              <IncomeBySource rows={rows} data={data} onOpen={onOpen} />
              <SpentByCategory rows={rows} data={data} onOpen={onOpen} />
            </>
          )}
      </div>
    </div>
  )
}

export function YearReport({ anchor, onAnchor, onOpen }: { anchor: Date; onAnchor: (d: Date) => void; onOpen: Open }) {
  const { data } = useData()
  const year = anchor.getFullYear()
  const thisYear = new Date().getFullYear()
  const y = useMemo(() => yearSummary(data, year), [data, year])
  const rows = useMemo(() => data.transactions.filter((t) => t.date.startsWith(`${year}-`)), [data, year])
  const chart = y.months.map((m) => ({ name: m.month.toLocaleDateString('en-PH', { month: 'short' }), Income: Math.round(m.income), Spent: Math.round(m.spent) }))
  return (
    <div>
      <PeriodStepper label={String(year)} prevLabel="Previous year" nextLabel="Next year"
        onPrev={() => onAnchor(new Date(year - 1, 0, 1))} onNext={() => onAnchor(new Date(year + 1, 0, 1))} atEnd={year >= thisYear} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card md:col-span-2">
          <Totals income={y.income} spent={y.spent} saved={y.saved} />
          <p className="text-xs text-muted mt-3">{year === thisYear ? 'So far this year, ' : ''}{y.monthsCounted} {y.monthsCounted === 1 ? 'month' : 'months'} with records. Only money already received or spent.</p>
          {year < thisYear - 1 && <p className="text-xs text-warn mt-1">The app only keeps the last {HISTORY_MONTHS} months loaded, so this year may be incomplete.</p>}
        </section>
        {rows.length === 0
          ? <section className="card md:col-span-2"><Empty icon="receipt" title="Nothing recorded this year" /></section>
          : (
            <>
              <section className="card md:col-span-2">
                <h2 className="font-bold mb-3">Month by month</h2>
                <div className="h-40">
                  <ResponsiveContainer>
                    <BarChart data={chart} barGap={2}>
                      <XAxis dataKey="name" interval={0} tick={{ fill: '#8f978f', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#292c29' }} contentStyle={{ background: '#1e211e', border: '1px solid #2c2f2c', borderRadius: 12 }}
                        formatter={(v) => peso(Number(v))} />
                      <Bar dataKey="Income" fill="#e1f7f7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Spent" fill="#f26b6b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <IncomeBySource rows={rows} data={data} onOpen={onOpen} fixedIncome={y.fixedIncome} />
              <SpentByCategory rows={rows} data={data} onOpen={onOpen} />
            </>
          )}
      </div>
    </div>
  )
}
