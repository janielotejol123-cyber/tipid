import { useState } from 'react'
import { useNavigate } from 'react-router'
import MoneyInput, { n } from '../components/MoneyInput'
import { IconPlus } from '../components/icons'
import { Empty, ErrorText, PageHeader, Progress, Sheet } from '../components/ui'
import type { GoalPlan } from '../lib/budget'
import { useData } from '../lib/household'
import { monthName, peso, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Goal } from '../lib/types'

export default function Goals() {
  const { plan, canManage } = useData()
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const rate = Math.round(plan.savingsRate * 100)

  return (
    <div>
      <PageHeader title="Savings & goals"
        right={canManage && <button className="btn-ghost btn-sm" onClick={() => setEditing('new')}><IconPlus size={16} />New goal</button>} />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-muted">Free money each month</p>
          <p className={`text-2xl font-extrabold mt-1 ${plan.free < 0 ? 'text-danger' : ''}`}>{peso(Math.round(plan.free))}</p>
          <p className="text-xs text-muted mt-1">Income − bills − usual spending</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Save this month</p>
          <p className="text-2xl font-extrabold mt-1">{peso(Math.round(plan.saveThisMonth))}</p>
          <Progress className="mt-2" value={plan.saveThisMonth ? plan.savedThisMonth / plan.saveThisMonth : 0} />
          <p className="text-xs text-muted mt-1">{peso(Math.round(plan.savedThisMonth))} saved so far</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Savings rate</p>
          <p className={`text-2xl font-extrabold mt-1 ${rate >= 20 ? 'text-lime' : 'text-warn'}`}>{rate}%</p>
          <p className="text-xs text-muted mt-1">{rate >= 20 ? 'Great — at least 20% of income.' : 'Aim for at least 20% of income.'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {plan.emergency && <GoalCard p={plan.emergency} onEdit={() => canManage && setEditing(plan.emergency!.goal)} />}
        {plan.goals.map((p) => <GoalCard key={p.goal.id} p={p} onEdit={() => canManage && setEditing(p.goal)} />)}
      </div>
      {!plan.emergency && plan.goals.length === 0 && (
        <div className="card"><Empty icon="🎯" title="No goals yet">Saving for a phone, trip or tuition? Add it and Tipid will make a plan.</Empty></div>
      )}

      {editing && <GoalForm goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function GoalCard({ p, onEdit }: { p: GoalPlan; onEdit: () => void }) {
  const nav = useNavigate()
  const { goal } = p
  const onTrack = p.gap <= 0
  return (
    <section className="card flex flex-col">
      <button onClick={onEdit} className="flex items-center gap-3 text-left">
        <span className="size-12 rounded-full bg-surface-2 text-2xl flex items-center justify-center shrink-0">{goal.emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold truncate">{goal.name}</span>
          <span className="block text-sm text-muted">
            {goal.target_date ? `By ${monthName(new Date(goal.target_date + 'T00:00:00'), false)}` : goal.is_emergency_fund ? 'Build within 12 months' : 'No deadline'}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-bold">{peso(p.saved)}</span>
          <span className="block text-xs text-muted">of {peso(goal.target_amount)}</span>
        </span>
      </button>
      <Progress className="mt-4" value={p.progress} />

      <div className="mt-4 text-sm flex-1">
        {p.done ? (
          <p className="text-lime font-semibold">🎉 Goal reached!</p>
        ) : p.needed === null ? (
          <p className="text-muted">
            {p.allocated > 0
              ? <>Saving <b className="text-ink">{peso(Math.round(p.allocated))}/month</b> gets you there by <b className="text-ink">{monthName(p.reachBy!)}</b>.</>
              : 'No free money to save right now. Try lowering your everyday spending.'}
          </p>
        ) : onTrack ? (
          <p className="text-muted">✅ Save <b className="text-lime">{peso(p.needed)}/month</b> and you'll reach it on time.</p>
        ) : (
          <Suggestions p={p} />
        )}
      </div>

      {!p.done && (
        <button className="btn-ghost btn-sm mt-4 self-start" onClick={() => nav(`/add?kind=saving&goal=${goal.id}`)}>
          <IconPlus size={16} /> Add savings
        </button>
      )}
    </section>
  )
}

function Suggestions({ p }: { p: GoalPlan }) {
  return (
    <div className="space-y-3">
      <p className="text-muted">
        You need <b className="text-ink">{peso(p.needed!)}/month</b>, but your budget only has <b className="text-ink">{peso(Math.round(p.allocated))}</b>.
        You're short <b className="text-warn">{peso(p.gap)}/month</b>. Pick one:
      </p>
      <Option n={1} title="Spend less">
        {p.cuts.length === 0 ? 'No everyday spending to cut.' : (
          <>
            <ul className="space-y-0.5">
              {p.cuts.map((c) => (
                <li key={c.category.id}>{c.category.icon} {c.category.name}: cut <b className="text-ink">{peso(c.cut)}</b>
                  <span className="text-muted"> ({peso(Math.round(c.current))} → {peso(Math.round(c.current - c.cut))})</span></li>
              ))}
            </ul>
            {!p.cutsCover && <p className="mt-1 text-warn">This only covers part of the gap — combine with another option.</p>}
          </>
        )}
      </Option>
      <Option n={2} title="Earn more">Add <b className="text-ink">{peso(p.earnMore)}/month</b> from a sideline, overtime or selling unused things.</Option>
      <Option n={3} title="Give it more time">
        {p.reachBy
          ? <>At {peso(Math.round(p.allocated))}/month, you'll reach it by <b className="text-ink">{monthName(p.reachBy)}</b>.</>
          : 'There is no free money to save right now — try option 1 or 2 first.'}
      </Option>
    </div>
  )
}

function Option({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="font-semibold mb-1"><span className="text-lime">{n}.</span> {title}</p>
      <div className="text-muted">{children}</div>
    </div>
  )
}

const EMOJIS = ['🎯', '📱', '💻', '✈️', '🏖️', '🎓', '🚗', '🏍️', '🏠', '💍', '🎄', '🛟', '👶', '🩺', '🎮', '🛋️']

function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { data, reload } = useData()
  const [name, setName] = useState(goal?.name ?? '')
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🎯')
  const [amount, setAmount] = useState<number | ''>(goal?.target_amount ?? '')
  const [date, setDate] = useState(goal?.target_date ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true); setError('')
    const row = { name: name.trim(), emoji, target_amount: n(amount), target_date: date || null }
    const { error } = goal
      ? await supabase.from('goals').update(row).eq('id', goal.id)
      : await supabase.from('goals').insert({ ...row, household_id: data.household.id })
    if (!error && goal?.is_emergency_fund) await supabase.from('households').update({ emergency_target: n(amount) }).eq('id', data.household.id)
    setBusy(false)
    if (error) return setError(error.message)
    await reload(); onClose()
  }

  async function archive() {
    if (!goal || !confirm(`Remove "${goal.name}"? Savings history is kept.`)) return
    await supabase.from('goals').update({ archived: true }).eq('id', goal.id)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`size-10 rounded-xl text-xl ${emoji === e ? 'bg-lime/20 ring-2 ring-lime' : 'bg-surface-2'}`}>{e}</button>
          ))}
        </div>
        <div><label className="label">What are you saving for?</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New phone" /></div>
        <div><label className="label">Target amount</label><MoneyInput value={amount} onChange={setAmount} /></div>
        <div><label className="label">Target date (optional)</label>
          <input className="field" type="date" min={ymd(new Date())} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-3 pt-2">
          {goal && !goal.is_emergency_fund && <button className="btn-ghost !text-danger" onClick={archive}>Remove</button>}
          <button className="btn-primary flex-1" disabled={!name.trim() || n(amount) <= 0 || busy} onClick={save}>{busy ? 'Saving…' : 'Save goal'}</button>
        </div>
      </div>
    </Sheet>
  )
}
