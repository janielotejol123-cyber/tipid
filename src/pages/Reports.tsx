import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { countPcs, IncomeBySource, Kpi, PeriodStepper, WeekReport, YearReport } from '../components/ReportViews'
import TxDetail from '../components/TxDetail'
import TxRow from '../components/TxRow'
import Glyph from '../components/Glyph'
import { IconChevron } from '../components/icons'
import { Empty, PageHeader, Progress, StatusPill } from '../components/ui'
import { monthSummary, statusFor } from '../lib/budget'
import { useData } from '../lib/household'
import { addMonths, monthName, monthStart, peso, sameMonth, ymd } from '../lib/money'
import type { Transaction } from '../lib/types'

const TYPE_COLORS = { fixed: '#9ce46c', other: '#e1f7f7', emergency: '#f26b6b', uncategorized: '#8f978f' }
const TYPE_LABEL = { fixed: 'Fixed bills', other: 'Everyday', emergency: 'Emergency', uncategorized: 'Other' }

const TABS = [{ id: 'week', label: 'Weekly' }, { id: 'month', label: 'Monthly' }, { id: 'year', label: 'Yearly' }] as const
type Tab = (typeof TABS)[number]['id']

export default function Reports() {
  const [tab, setTab] = useState<Tab>('month')
  // One shared date, so switching tabs stays around the period being looked at
  const [anchor, setAnchor] = useState(() => new Date())
  const [open, setOpen] = useState<Transaction | null>(null)

  return (
    <div>
      <PageHeader title="Reports" />
      <div role="tablist" aria-label="Report period" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1 mb-4">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`h-10 rounded-full text-sm font-semibold transition ${tab === t.id ? 'bg-lime text-bg' : 'text-muted'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'week' && <WeekReport anchor={anchor} onAnchor={setAnchor} onOpen={setOpen} />}
      {tab === 'month' && <MonthReport month={monthStart(anchor)} onMonth={setAnchor} onOpen={setOpen} />}
      {tab === 'year' && <YearReport anchor={anchor} onAnchor={setAnchor} onOpen={setOpen} />}
      <TxDetail tx={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function MonthReport({ month, onMonth, onOpen }: { month: Date; onMonth: (d: Date) => void; onOpen: (t: Transaction) => void }) {
  const { data, plan } = useData()
  const [openCat, setOpenCat] = useState<string | null>(null)
  const isCurrent = ymd(month) === ymd(monthStart(new Date()))

  const m = useMemo(() => monthSummary(data, month), [data, month])
  const prev = useMemo(() => monthSummary(data, addMonths(month, -1)), [data, month])
  const trend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(month, i - 5); const s = monthSummary(data, d)
    return { name: d.toLocaleDateString('en-PH', { month: 'short' }), Income: Math.round(s.income), Spent: Math.round(s.spent), Saved: Math.round(s.saved) }
  }), [data, month])

  // Current month: count bills still due so the verdict isn't too rosy mid-month
  const committed = m.spent + (isCurrent ? m.unpaidTotal : 0)
  const status = statusFor(committed, m.income)
  const net = m.income - m.spent - m.saved
  const diff = m.spent - prev.spent
  const rate = m.income > 0 ? Math.round((m.saved / m.income) * 100) : 0
  const txs = data.transactions.filter((t) => sameMonth(t.date, month))
  const pie = (Object.keys(m.byType) as (keyof typeof m.byType)[]).filter((k) => m.byType[k] > 0).map((k) => ({ key: k, name: TYPE_LABEL[k], value: m.byType[k] }))

  const verdict = m.spent === 0 && m.saved === 0 && !isCurrent
    ? 'Nothing recorded for this month.'
    : isCurrent
      ? committed > m.income
        ? `After the bills still due, you'll be ${peso(Math.round(committed - m.income))} short this month.`
        : `So far so good — after the ${peso(Math.round(m.unpaidTotal))} in bills still due, ${peso(Math.round(m.income - committed))} is left.`
    : m.spent > m.income
      ? `You spent ${peso(Math.round(m.spent - m.income))} more than you earned.`
      : status === 'tight'
        ? `Your income covered your expenses, but only ${peso(Math.round(m.income - m.spent))} was left.`
        : `Your income covered your expenses with ${peso(Math.round(m.income - m.spent))} to spare.`

  return (
    <div>
      <PeriodStepper label={monthName(month)} prevLabel="Previous month" nextLabel="Next month"
        onPrev={() => onMonth(addMonths(month, -1))} onNext={() => onMonth(addMonths(month, 1))} atEnd={isCurrent} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted min-w-0">{verdict}</p>
            <StatusPill status={status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <Kpi k={m.incomePending ? 'Income (expected)' : 'Income'} v={`${m.incomePending ? '≈ ' : ''}${peso(Math.round(m.income))}`}
              sub={m.incomePending ? `${peso(Math.round(m.variableReceived))} of ≈ ${peso(Math.round(m.variableExpected))} business received`
                : m.variableReceived > 0 ? `incl. ${peso(Math.round(m.variableReceived))} business/projects`
                : m.extraIncome > 0 ? `incl. ${peso(m.extraIncome)} extra` : undefined}
              subTone={m.incomePending ? 'text-warn' : 'text-muted'} />
            <Kpi k="Spent" v={peso(Math.round(m.spent))}
              sub={prev.spent > 0 && !isCurrent ? `${diff >= 0 ? '▲' : '▼'} ${peso(Math.abs(Math.round(diff)))} vs last month` : isCurrent && m.unpaidTotal > 0 ? `+ ${peso(m.unpaidTotal)} bills due` : undefined}
              subTone={isCurrent ? 'text-warn' : diff > 0 ? 'text-danger' : 'text-lime'} />
            <Kpi k="Saved" v={peso(Math.round(m.saved))} sub={`${rate}% of income`} subTone={rate >= 20 ? 'text-lime' : 'text-warn'} />
            <Kpi k={isCurrent ? 'Left after bills' : 'Left over'} v={peso(Math.round(net - (isCurrent ? m.unpaidTotal : 0)))} tone={net - (isCurrent ? m.unpaidTotal : 0) < 0 ? 'text-danger' : ''} />
          </div>
          {m.lateFees > 0 && (
            <p className="mt-5 rounded-2xl bg-danger/10 text-danger text-sm px-4 py-3 flex items-center gap-2">
              <Glyph name="stop" size={18} />{peso(m.lateFees)} went to late fees and penalties this month. Paying bills on time saves this.
            </p>
          )}
        </section>

        <IncomeBySource rows={txs} data={data} onOpen={onOpen} fixedIncome={m.plannedIncome} />

        <section className="card">
          <h2 className="font-bold mb-3">Where the money went</h2>
          {pie.length === 0 ? <Empty icon="chart" title="No expenses this month" /> : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="size-36 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" innerRadius="62%" outerRadius="100%" stroke="none" paddingAngle={2}>
                      {pie.map((p) => <Cell key={p.key} fill={TYPE_COLORS[p.key]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 min-w-40 space-y-2 text-sm">
                {pie.map((p) => (
                  <li key={p.key} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: TYPE_COLORS[p.key] }} />
                    <span className="flex-1">{p.name}</span>
                    <span className="font-semibold">{peso(Math.round(p.value))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">Last 6 months</h2>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={trend} barGap={2}>
                <XAxis dataKey="name" tick={{ fill: '#8f978f', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#292c29' }} contentStyle={{ background: '#1e211e', border: '1px solid #2c2f2c', borderRadius: 12 }}
                  formatter={(v) => peso(Number(v))} />
                <Bar dataKey="Income" fill="#e1f7f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#f26b6b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saved" fill="#9ce46c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">By category</h2>
          {m.byCategory.length === 0 ? <p className="text-sm text-muted">No expenses.</p> : (
            <ul className="space-y-3">
              {m.byCategory.map(({ category: c, amount }) => {
                const budget = c?.monthly_budget ?? 0
                const over = budget > 0 && amount > budget
                const key = c?.id ?? 'none'
                const expanded = openCat === key
                const rows = txs.filter((t) => t.kind === 'expense' && (t.category_id ?? 'none') === key)
                return (
                  <li key={key}>
                    <button className="w-full text-left" aria-expanded={expanded} onClick={() => setOpenCat(expanded ? null : key)}>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <IconChevron size={14} className={`text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          <Glyph name={c?.icon} size={16} className="text-muted shrink-0" /><span className="truncate">{c?.name ?? 'Uncategorized'}</span>
                        </span>
                        <span className={`font-semibold whitespace-nowrap ${over ? 'text-danger' : ''}`}>{peso(Math.round(amount))}{budget > 0 && <span className="text-muted font-normal"> / {peso(budget)}</span>}</span>
                      </div>
                      <Progress value={budget > 0 ? amount / budget : amount / Math.max(1, m.spent)} tone={over ? 'bg-danger' : 'bg-lime'} />
                    </button>
                    {expanded && (
                      <>
                        <p className="text-xs text-muted mt-2">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}{countPcs(rows) > 0 ? ` · ${countPcs(rows).toLocaleString('en-PH')} pcs` : ''}</p>
                        <div className="divide-y divide-line">{rows.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => onOpen(t)} />)}</div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">By family member</h2>
          {m.byMember.length === 0 ? <p className="text-sm text-muted">No expenses.</p> : (
            <ul className="space-y-3">
              {m.byMember.map(({ member, amount }) => (
                <li key={member?.id ?? 'none'}>
                  <div className="flex justify-between text-sm mb-1"><span>{member?.name ?? 'Not assigned'}</span><span className="font-semibold">{peso(Math.round(amount))}</span></div>
                  <Progress value={amount / Math.max(1, m.spent)} />
                </li>
              ))}
            </ul>
          )}

          {(plan.emergency || plan.goals.length > 0) && (
            <>
              <h2 className="font-bold mt-6 mb-3">Goals</h2>
              <ul className="space-y-3">
                {[plan.emergency, ...plan.goals].filter(Boolean).map((p) => (
                  <li key={p!.goal.id}>
                    <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><Glyph name={p!.goal.emoji} size={16} fallback="target" className="text-muted" />{p!.goal.name}</span><span className="font-semibold">{Math.round(p!.progress * 100)}%</span></div>
                    <Progress value={p!.progress} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card md:col-span-2">
          <h2 className="font-bold mb-1">All transactions</h2>
          {txs.length === 0 ? <Empty icon="receipt" title="Nothing recorded" /> : (
            <div className="divide-y divide-line">{txs.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => onOpen(t)} />)}</div>
          )}
        </section>
      </div>
    </div>
  )
}
