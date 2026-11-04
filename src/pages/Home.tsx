import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import TxDetail from '../components/TxDetail'
import TxRow from '../components/TxRow'
import Glyph from '../components/Glyph'
import { InstallBanner } from '../components/InstallApp'
import { IconChart, IconChevron, IconPiggy, IconReceipt, IconSettings } from '../components/icons'
import { Avatar, Empty, Logo, Progress, StatusPill } from '../components/ui'
import { safeToSpend } from '../lib/budget'
import { useData } from '../lib/household'
import { monthName, ord, peso } from '../lib/money'
import type { Transaction } from '../lib/types'

export default function Home() {
  const nav = useNavigate()
  const { data, me, thisMonth: m, plan } = useData()
  const [open, setOpen] = useState<Transaction | null>(null)
  const safe = safeToSpend(m, plan)
  const day = new Date().getDate()
  const recent = data.transactions.slice(0, 6)
  const toSave = Math.max(0, plan.saveThisMonth - m.saved)
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const actions = [
    { label: 'Expense', icon: <span className="text-2xl font-bold leading-none">−</span>, to: '/add?kind=expense' },
    { label: 'Pay bill', icon: <IconReceipt />, to: '/bills' },
    { label: 'Save', icon: <IconPiggy />, to: '/add?kind=saving' },
    { label: 'Report', icon: <IconChart />, to: '/reports' },
  ]

  return (
    <div className="space-y-6">
      {/* Top bar (mobile) */}
      <div className="flex items-center gap-3">
        <Avatar name={me?.name ?? '?'} tone="bg-lime text-bg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted">{hello},</p>
          <p className="font-bold text-lg truncate">{me?.name}</p>
        </div>
        <Logo className="md:hidden text-xl" />
        <Link to="/settings" className="md:hidden size-10 rounded-full bg-surface flex items-center justify-center" aria-label="Settings"><IconSettings size={20} /></Link>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Balance card */}
          <section className="rounded-3xl p-6 bg-gradient-to-br from-surface-2 to-surface border border-line relative overflow-hidden">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-lime/10 blur-2xl" />
            <div className="flex items-center justify-between relative">
              <span className="text-sm text-muted">Safe to spend · {monthName(new Date())}</span>
              <StatusPill status={m.status} />
            </div>
            <div className={`text-4xl md:text-5xl font-extrabold mt-2 relative ${safe < 0 ? 'text-danger' : ''}`}>{peso(Math.round(safe))}</div>
            <p className="text-sm text-muted mt-1 relative">
              {safe < 0 ? "You're over budget this month." : `After bills and ${peso(Math.round(Math.max(plan.saveThisMonth, m.saved)))} savings.`}
            </p>
            <Progress className="mt-5" value={m.income ? (m.spent + m.unpaidTotal) / m.income : 1}
              tone={m.status === 'ok' ? 'bg-lime' : m.status === 'tight' ? 'bg-warn' : 'bg-danger'} />
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm relative">
              <Stat k="Income" v={peso(Math.round(m.income))} />
              <Stat k="Spent" v={peso(Math.round(m.spent))} />
              <Stat k="Saved" v={peso(Math.round(m.saved))} tone="text-lime" />
            </div>
          </section>

          <InstallBanner />

          {/* Quick actions (GoTyme-style round buttons) */}
          <section className="grid grid-cols-4 gap-2">
            {actions.map((a) => (
              <button key={a.label} onClick={() => nav(a.to)} className="flex flex-col items-center gap-2">
                <span className="size-14 rounded-full bg-surface flex items-center justify-center text-lime hover:bg-surface-2 transition">{a.icon}</span>
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </section>

          {/* Recent */}
          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">Recent activity</h2>
              <Link to="/reports" className="text-sm text-lime font-semibold">See all</Link>
            </div>
            {recent.length === 0
              ? <Empty icon="receipt" title="No transactions yet">Tap <b className="text-lime">+</b> to add your first expense.</Empty>
              : <div className="divide-y divide-line">{recent.map((t) => <TxRow key={t.id} tx={t} data={data} onClick={() => setOpen(t)} />)}</div>}
          </section>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Save this month */}
          <Link to="/goals" className="card block">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Save this month</h2><IconChevron size={18} className="text-muted" />
            </div>
            {plan.saveThisMonth > 0 ? (
              <>
                <div className="text-2xl font-extrabold mt-2">{peso(Math.round(toSave))} <span className="text-sm font-medium text-muted">to go</span></div>
                <Progress className="mt-3" value={m.saved / plan.saveThisMonth} />
                <p className="text-sm text-muted mt-2">{peso(Math.round(m.saved))} of {peso(Math.round(plan.saveThisMonth))} saved</p>
              </>
            ) : (
              <p className="text-sm text-muted mt-2">
                {plan.free <= 0 ? 'No room to save yet — check Goals for ways to free up money.' : 'Add a goal to get a monthly savings plan.'}
              </p>
            )}
          </Link>

          {/* Upcoming bills */}
          <section className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Bills to pay</h2>
              <Link to="/bills" className="text-sm text-lime font-semibold">All bills</Link>
            </div>
            {m.unpaidBills.length === 0
              ? <p className="text-sm text-muted py-2 flex items-center gap-2"><Glyph name="check" size={18} className="text-lime" />All bills paid this month.</p>
              : m.unpaidBills.slice(0, 4).map((b) => {
                const late = b.due_day && b.due_day < day
                return (
                  <div key={b.id} className="flex items-center gap-3 py-2.5">
                    <span className="size-9 rounded-full bg-surface-2 text-lime flex items-center justify-center shrink-0"><Glyph name={b.icon} size={18} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{b.name}</span>
                      <span className={`block text-xs ${late ? 'text-danger' : 'text-muted'}`}>
                        {b.due_day ? (late ? `Overdue · was due on the ${ord(b.due_day)}` : `Due on the ${ord(b.due_day)}`) : 'This month'}
                      </span>
                    </span>
                    <span className="font-bold">{peso(b.monthly_budget)}</span>
                  </div>
                )
              })}
          </section>
        </div>
      </div>

      <TxDetail tx={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function Stat({ k, v, tone = '' }: { k: string; v: string; tone?: string }) {
  return <div><div className="text-muted text-xs">{k}</div><div className={`font-bold truncate ${tone}`}>{v}</div></div>
}

