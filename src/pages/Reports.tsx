import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import TxDetail from '../components/TxDetail'
import TxRow from '../components/TxRow'
import Glyph from '../components/Glyph'
import { IconBack, IconChevron } from '../components/icons'
import { Empty, PageHeader, Progress, StatusPill } from '../components/ui'
import { monthSummary, statusFor } from '../lib/budget'
import { useData } from '../lib/household'
import { addMonths, monthName, monthStart, peso, sameMonth, ymd } from '../lib/money'
import type { Transaction } from '../lib/types'

const TYPE_COLORS = { fixed: '#9ce46c', other: '#e1f7f7', emergency: '#f26b6b', uncategorized: '#8f978f' }
const TYPE_LABEL = { fixed: 'Fixed bills', other: 'Everyday', emergency: 'Emergency', uncategorized: 'Other' }

export default function Reports() {
  const { data, plan } = useData()
  const [month, setMonth] = useState(() => monthStart(new Date()))
  const [open, setOpen] = useState<Transaction | null>(null)
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
      <PageHeader title="Reports" />

      <div className="flex items-center justify-between card !py-3 !px-3 mb-5">
        <button className="size-10 rounded-full bg-surface-2 flex items-center justify-center" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><IconBack /></button>
        <span className="font-bold">{monthName(month)}</span>
        <button className="size-10 rounded-full bg-surface-2 flex items-center justify-center disabled:opacity-30" disabled={isCurrent}
          onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><IconChevron /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-lg">{verdict}</p>
            <StatusPill status={status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <Kpi k="Income" v={peso(Math.round(m.income))} sub={m.extraIncome > 0 ? `incl. ${peso(m.extraIncome)} extra` : undefined} />
            <Kpi k="Spent" v={peso(Math.round(m.spent))}
              sub={prev.spent > 0 && !isCurrent ? `${diff >= 0 ? '▲' : '▼'} ${peso(Math.abs(Math.round(diff)))} vs last month` : isCurrent && m.unpaidTotal > 0 ? `+ ${peso(m.unpaidTotal)} bills due` : undefined}
              subTone={isCurrent ? 'text-warn' : diff > 0 ? 'text-danger' : 'text-lime'} />
            <Kpi k="Saved" v={peso(Math.round(m.saved))} sub={`${rate}% of income`} subTone={rate >= 20 ? 'text-lime' : 'text-warn'} />
            <Kpi k={isCurrent ? 'Left after bills' : 'Left over'} v={peso(Math.round(net - (isCurrent ? m.unpaidTotal : 0)))} tone={net - (isCurrent ? m.unpaidTotal : 0) < 0 ? 'text-danger' : ''} />
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold mb-3">Where the money went</h2>
          {pie.length === 0 ? <Empty icon="chart" title="No expenses this month" /> : (
            <div className="flex items-center gap-4">
              <div className="size-36 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" innerRadius="62%" outerRadius="100%" stroke="none" paddingAngle={2}>
                      {pie.map((p) => <Cell key={p.key} fill={TYPE_COLORS[p.key]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-sm">
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
                return (
                  <li key={c?.id ?? 'none'}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2"><Glyph name={c?.icon} size={16} className="text-muted" />{c?.name ?? 'Uncategorized'}</span>
                      <span className={`font-semibold ${over ? 'text-danger' : ''}`}>{peso(Math.round(amount))}{budget > 0 && <span className="text-muted font-normal"> / {peso(budget)}</span>}</span>
                    </div>
                    <Progress value={budget > 0 ? amount / budget : amount / Math.max(1, m.spent)} tone={over ? 'bg-danger' : 'bg-lime'} />
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
            <div className="divide-y divide-line">{txs.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => setOpen(t)} />)}</div>
          )}
        </section>
      </div>
      <TxDetail tx={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function Kpi({ k, v, sub, tone = '', subTone = 'text-muted' }: { k: string; v: string; sub?: string; tone?: string; subTone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{k}</p>
      <p className={`text-xl font-extrabold ${tone}`}>{v}</p>
      {sub && <p className={`text-xs ${subTone}`}>{sub}</p>}
    </div>
  )
}
