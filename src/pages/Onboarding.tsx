import { useState, type ReactNode } from 'react'
import MoneyInput, { n } from '../components/MoneyInput'
import { IconBack, IconClose, IconPlus } from '../components/icons'
import { ErrorText, Logo, StatusPill } from '../components/ui'
import { useAuth } from '../lib/auth'
import { OK_RATIO, statusFor } from '../lib/budget'
import { useHousehold } from '../lib/household'
import { payLabel, peso, toMonthly, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { PaySchedule } from '../lib/types'

type Money = number | ''
type HouseholdType = 'solo' | 'partner' | 'family'
interface Line { name: string; icon: string; on: boolean; amount: Money; due?: number | '' }
interface Kid { name: string; birthYear: number | '' }

const GOALS = [
  { id: 'overspending', icon: '🛑', label: 'Stop overspending' },
  { id: 'savings', icon: '🐷', label: 'Build my savings' },
  { id: 'specific', icon: '📱', label: 'Save for something specific' },
  { id: 'debt', icon: '💳', label: 'Pay off debt' },
  { id: 'track', icon: '👀', label: 'Just track where money goes' },
]

const DEFAULT_BILLS: Line[] = [
  { name: 'House rent', icon: '🏠', on: true, amount: '', due: 5 },
  { name: 'Water', icon: '💧', on: true, amount: '', due: 15 },
  { name: 'Electricity', icon: '⚡', on: true, amount: '', due: 15 },
  { name: 'Internet', icon: '📶', on: true, amount: '', due: 20 },
  { name: 'Groceries', icon: '🛒', on: true, amount: '', due: '' },
]
const DEFAULT_OTHER: Line[] = [
  { name: 'Food & eating out', icon: '🍔', on: true, amount: '' },
  { name: 'Transportation', icon: '🚌', on: true, amount: '' },
  { name: 'Load & data', icon: '📱', on: true, amount: '' },
  { name: 'Shopping', icon: '🛍️', on: true, amount: '' },
  { name: 'School', icon: '🎒', on: false, amount: '' },
]

const thisYear = new Date().getFullYear()
const roleForKid = (by: Money) => (by !== '' && thisYear - by >= 15 ? 'teen' : 'child')

export default function Onboarding() {
  const { session } = useAuth()
  const { reload } = useHousehold()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [goal, setGoal] = useState('')
  const [type, setType] = useState<HouseholdType>('solo')
  const [myName, setMyName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [kids, setKids] = useState<Kid[]>([])
  const [schedule, setSchedule] = useState<PaySchedule>('semi_monthly')
  const [myIncome, setMyIncome] = useState<Money>('')
  const [partnerIncome, setPartnerIncome] = useState<Money>('')
  const [bills, setBills] = useState<Line[]>(DEFAULT_BILLS)
  const [other, setOther] = useState<Line[]>(DEFAULT_OTHER)
  const [efTarget, setEfTarget] = useState<Money>('')
  const [efSaved, setEfSaved] = useState<Money>('')
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState<Money>('')
  const [goalDate, setGoalDate] = useState('')

  const hasPartner = type !== 'solo'
  const income = toMonthly(n(myIncome), schedule) + (hasPartner ? toMonthly(n(partnerIncome), schedule) : 0)
  const fixed = bills.filter((b) => b.on).reduce((a, b) => a + n(b.amount), 0)
  const otherTotal = other.filter((b) => b.on).reduce((a, b) => a + n(b.amount), 0)
  const spending = fixed + otherTotal
  const left = income - spending
  const suggestedEf = Math.round((fixed * 3) / 1000) * 1000

  const steps: { title: string; sub?: string; body: ReactNode; ok: boolean }[] = [
    {
      title: "What's your main goal?",
      sub: 'This helps Tipid give you the right tips.',
      ok: !!goal,
      body: (
        <div className="space-y-3">
          {GOALS.map((g) => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`w-full card !p-4 flex items-center gap-4 text-left border-2 transition ${goal === g.id ? 'border-lime' : 'border-transparent'}`}>
              <span className="text-2xl">{g.icon}</span><span className="font-semibold">{g.label}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Who's in your household?",
      sub: 'You can add or invite family members later too.',
      ok: !!myName.trim() && (!hasPartner || !!partnerName.trim()) && kids.every((k) => k.name.trim()),
      body: (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {([['solo', '🙋', 'Just me'], ['partner', '👫', 'Me + partner'], ['family', '👨‍👩‍👧', 'With kids']] as const).map(([id, icon, label]) => (
              <button key={id} onClick={() => { setType(id); if (id === 'family' && !kids.length) setKids([{ name: '', birthYear: '' }]); if (id !== 'family') setKids([]) }}
                className={`card !p-4 text-center border-2 ${type === id ? 'border-lime' : 'border-transparent'}`}>
                <div className="text-2xl">{icon}</div><div className="text-sm font-semibold mt-1">{label}</div>
              </button>
            ))}
          </div>
          <div><label className="label">Your name</label>
            <input className="field" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="e.g. Jun" /></div>
          {hasPartner && (
            <div><label className="label">Partner's name</label>
              <input className="field" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="e.g. Ana" /></div>
          )}
          {type === 'family' && (
            <div className="space-y-2">
              <label className="label">Children</label>
              {kids.map((k, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="field flex-1" placeholder="Name" value={k.name}
                    onChange={(e) => setKids(kids.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className="field !w-28" type="number" inputMode="numeric" placeholder="Birth yr" value={k.birthYear}
                    onChange={(e) => setKids(kids.map((x, j) => j === i ? { ...x, birthYear: e.target.value === '' ? '' : Number(e.target.value) } : x))} />
                  <button className="size-12 shrink-0 rounded-2xl bg-surface-2 flex items-center justify-center text-muted" aria-label="Remove"
                    onClick={() => setKids(kids.filter((_, j) => j !== i))}><IconClose size={18} /></button>
                </div>
              ))}
              <button className="btn-ghost btn-sm" onClick={() => setKids([...kids, { name: '', birthYear: '' }])}><IconPlus size={16} />Add child</button>
              <p className="text-xs text-muted">Kids 15 and older can get their own login later. Younger kids are tracked by a parent.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'How much do you earn?',
      sub: 'Take-home pay (after tax and deductions).',
      ok: n(myIncome) > 0 || (hasPartner && n(partnerIncome) > 0),
      body: (
        <div className="space-y-5">
          <div><label className="label">How often are you paid?</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(payLabel) as PaySchedule[]).map((p) => (
                <button key={p} className={`chip ${schedule === p ? 'chip-on' : ''}`} onClick={() => setSchedule(p)}>{payLabel[p]}</button>
              ))}
            </div></div>
          <div><label className="label">{myName || 'Your'} pay {schedule === 'monthly' ? 'per month' : schedule === 'weekly' ? 'per week' : 'per payday'}</label>
            <MoneyInput value={myIncome} onChange={setMyIncome} /></div>
          {hasPartner && (
            <div><label className="label">{partnerName || 'Partner'}'s pay {schedule === 'monthly' ? 'per month' : schedule === 'weekly' ? 'per week' : 'per payday'}</label>
              <MoneyInput value={partnerIncome} onChange={setPartnerIncome} /></div>
          )}
          {income > 0 && <p className="text-sm text-muted">That's about <b className="text-ink">{peso(Math.round(income))}</b> a month.</p>}
        </div>
      ),
    },
    {
      title: 'Your fixed bills',
      sub: 'The ones you pay every month. Estimates are fine.',
      ok: true,
      body: <LineEditor lines={bills} setLines={setBills} withDue total={fixed} />,
    },
    {
      title: 'Other monthly spending',
      sub: 'Roughly how much goes to these each month?',
      ok: true,
      body: <LineEditor lines={other} setLines={setOther} total={otherTotal} />,
    },
    {
      title: 'Emergency fund',
      sub: 'Money set aside for surprises — sickness, repairs, job loss.',
      ok: true,
      body: (
        <div className="space-y-5">
          <div className="card bg-lime/10 text-sm">
            💡 A good target is <b>3 months of fixed bills</b>{suggestedEf > 0 && <> — about <b className="text-lime">{peso(suggestedEf)}</b> for you</>}.
          </div>
          <div><label className="label">Target</label>
            <MoneyInput value={efTarget} onChange={setEfTarget} placeholder={suggestedEf ? String(suggestedEf) : '0'} /></div>
          <div><label className="label">How much do you already have saved for emergencies?</label>
            <MoneyInput value={efSaved} onChange={setEfSaved} /></div>
        </div>
      ),
    },
    {
      title: 'Saving for something?',
      sub: 'Like a new phone, a trip or tuition. You can skip this.',
      ok: !goalName.trim() || n(goalAmount) > 0,
      body: (
        <div className="space-y-5">
          <div><label className="label">What is it?</label>
            <input className="field" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. New phone" /></div>
          <div><label className="label">How much?</label><MoneyInput value={goalAmount} onChange={setGoalAmount} /></div>
          <div><label className="label">By when? (optional)</label>
            <input className="field" type="date" min={ymd(new Date())} value={goalDate} onChange={(e) => setGoalDate(e.target.value)} /></div>
        </div>
      ),
    },
    {
      title: 'Your money at a glance',
      ok: true,
      body: (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted text-sm">Left each month</span>
              <StatusPill status={statusFor(spending, income)} />
            </div>
            <div className={`text-4xl font-extrabold ${left < 0 ? 'text-danger' : ''}`}>{peso(Math.round(left))}</div>
            <div className="mt-5 space-y-2 text-sm">
              <Row k="Income" v={peso(Math.round(income))} />
              <Row k="Fixed bills" v={`− ${peso(fixed)}`} />
              <Row k="Other spending" v={`− ${peso(otherTotal)}`} />
            </div>
          </div>
          <p className="text-muted">
            {left < 0
              ? `Your expenses are ${peso(Math.round(-left))} more than your income. Tipid will help you find where to cut.`
              : income > 0 && spending / income > OK_RATIO
                ? `Your income covers your expenses, but there's little room to save. Aim to keep at least ${peso(Math.round(income * 0.2))} (20%) each month.`
                : `Your income covers your expenses and you can save about ${peso(Math.round(left))} a month. 🎉`}
          </p>
          <ErrorText>{error}</ErrorText>
        </div>
      ),
    },
  ]

  const s = steps[step]
  const last = step === steps.length - 1

  async function finish() {
    setBusy(true); setError('')
    let hid: string | null = null
    try {
      const uid = session!.user.id
      const { data: newId, error: e1 } = await supabase.rpc('create_household', {
        p_name: `${myName.trim()}'s household`, p_owner_name: myName.trim(), p_pay_schedule: schedule, p_main_goal: goal,
      })
      if (e1) throw e1
      hid = newId as string
      const { data: meRow, error: e2 } = await supabase.from('members').select('id').eq('household_id', hid).eq('user_id', uid).single()
      if (e2) throw e2

      const extra = [
        ...(hasPartner ? [{ household_id: hid, name: partnerName.trim(), role: 'adult', birth_year: null }] : []),
        ...kids.filter((k) => k.name.trim()).map((k) => ({ household_id: hid, name: k.name.trim(), role: roleForKid(k.birthYear), birth_year: k.birthYear || null })),
      ]
      let partnerId: string | null = null
      if (extra.length) {
        const { data, error } = await supabase.from('members').insert(extra, { defaultToNull: false }).select('id, role')
        if (error) throw error
        partnerId = hasPartner ? data[0].id : null
      }

      const incomes = [
        n(myIncome) > 0 && { household_id: hid, member_id: meRow.id, source: 'Salary', amount: n(myIncome), frequency: schedule },
        partnerId && n(partnerIncome) > 0 && { household_id: hid, member_id: partnerId, source: 'Salary', amount: n(partnerIncome), frequency: schedule },
      ].filter((x): x is Exclude<typeof x, false | null | '' | 0> => !!x)
      if (incomes.length) { const { error } = await supabase.from('incomes').insert(incomes, { defaultToNull: false }); if (error) throw error }

      const cats = [
        ...bills.filter((b) => b.on).map((b) => ({ household_id: hid, name: b.name, icon: b.icon, type: 'fixed', monthly_budget: n(b.amount), due_day: b.due || null })),
        ...other.filter((b) => b.on).map((b) => ({ household_id: hid, name: b.name, icon: b.icon, type: 'other', monthly_budget: n(b.amount), due_day: null })),
        { household_id: hid, name: 'Medical', icon: '🏥', type: 'emergency', monthly_budget: 0, due_day: null },
        { household_id: hid, name: 'Repairs', icon: '🔧', type: 'emergency', monthly_budget: 0, due_day: null },
      ]
      { const { error } = await supabase.from('categories').insert(cats, { defaultToNull: false }); if (error) throw error }

      const target = n(efTarget) || suggestedEf
      const goalsIns = [
        target > 0 && { household_id: hid, name: 'Emergency fund', emoji: '🛟', target_amount: target, target_date: null, is_emergency_fund: true },
        goalName.trim() && n(goalAmount) > 0 && { household_id: hid, name: goalName.trim(), emoji: '🎯', target_amount: n(goalAmount), target_date: goalDate || null, is_emergency_fund: false },
      ].filter((x): x is Exclude<typeof x, false | null | '' | 0> => !!x)
      if (goalsIns.length) {
        const { data: g, error } = await supabase.from('goals').insert(goalsIns, { defaultToNull: false }).select('id, is_emergency_fund')
        if (error) throw error
        const ef = g.find((x) => x.is_emergency_fund)
        if (ef && n(efSaved) > 0) {
          const { error } = await supabase.from('transactions').insert({
            household_id: hid, member_id: meRow.id, kind: 'saving', goal_id: ef.id, amount: n(efSaved), note: 'Starting balance',
          })
          if (error) throw error
        }
      }
      { const { error } = await supabase.from('households').update({ emergency_target: target }).eq('id', hid); if (error) throw error }
      await reload()
    } catch (e) {
      // Undo the half-created household so "try again" starts fresh (deletes cascade)
      if (hid) await supabase.from('households').delete().eq('id', hid)
      setError(`Something went wrong while saving. Please try again. (${(e as { message?: string }).message ?? String(e)})`)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto p-5 md:py-12">
      <div className="flex items-center gap-3 mb-6">
        {step > 0
          ? <button onClick={() => setStep(step - 1)} className="size-10 rounded-full bg-surface flex items-center justify-center" aria-label="Back"><IconBack /></button>
          : <Logo />}
        <div className="flex-1 flex gap-1.5 ml-2">
          {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-lime' : 'bg-surface-2'}`} />)}
        </div>
      </div>
      <h1 className="text-3xl font-bold leading-tight">{s.title}</h1>
      {s.sub && <p className="text-muted mt-2">{s.sub}</p>}
      <div className="mt-7 flex-1">{s.body}</div>
      <div className="sticky bottom-0 bg-bg pt-4 pb-safe mt-6 flex gap-3">
        {step === 6 && !goalName && <button className="btn-ghost flex-1" onClick={() => setStep(step + 1)}>Skip</button>}
        <button className="btn-primary flex-1" disabled={!s.ok || busy} onClick={() => (last ? finish() : setStep(step + 1))}>
          {busy ? 'Setting up…' : last ? 'Start using Tipid' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted">{k}</span><span className="font-semibold">{v}</span></div>
}

function LineEditor({ lines, setLines, withDue, total }: { lines: Line[]; setLines: (l: Line[]) => void; withDue?: boolean; total: number }) {
  const upd = (i: number, p: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)))
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className={`card !p-3 transition ${l.on ? '' : 'opacity-50'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => upd(i, { on: !l.on })} aria-label={l.on ? 'Remove' : 'Include'}
              className={`size-6 shrink-0 rounded-lg border-2 flex items-center justify-center text-xs font-bold ${l.on ? 'bg-lime border-lime text-bg' : 'border-line'}`}>{l.on && '✓'}</button>
            <span className="text-xl">{l.icon}</span>
            <input className="bg-transparent flex-1 min-w-0 font-semibold" value={l.name} onChange={(e) => upd(i, { name: e.target.value })} />
            <MoneyInput value={l.amount} onChange={(v) => upd(i, { amount: v, on: true })} className="!w-32 !h-10 !rounded-xl" />
          </div>
          {withDue && l.on && (
            <div className="flex items-center gap-2 mt-2 ml-9 text-sm text-muted">
              Due every
              <input type="number" inputMode="numeric" min={1} max={31} className="bg-surface-2 rounded-lg w-14 h-8 text-center text-ink"
                value={l.due ?? ''} placeholder="–" onChange={(e) => upd(i, { due: e.target.value === '' ? '' : Math.min(31, Math.max(1, Number(e.target.value))) })} />
              of the month
            </div>
          )}
        </div>
      ))}
      <button className="btn-ghost btn-sm" onClick={() => setLines([...lines, { name: 'New item', icon: '💸', on: true, amount: '', due: '' }])}>
        <IconPlus size={16} /> Add another
      </button>
      <p className="text-right text-muted pt-2">Total <b className="text-ink text-lg ml-1">{peso(total)}</b> / month</p>
    </div>
  )
}
