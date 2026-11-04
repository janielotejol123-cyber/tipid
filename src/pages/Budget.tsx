import { useState } from 'react'
import { Link } from 'react-router'
import CategoryForm from '../components/CategoryForm'
import Glyph from '../components/Glyph'
import MoneyInput, { n } from '../components/MoneyInput'
import { IconChevron, IconPlus } from '../components/icons'
import { ErrorText, PageHeader, Sheet } from '../components/ui'
import { useData } from '../lib/household'
import { incomeEstimate } from '../lib/budget'
import { payLabel, peso, toMonthly } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Category, CategoryType, Income, IncomeFrequency, PaySchedule, Scope } from '../lib/types'

export default function Budget() {
  const { data, plan, canManage, reload } = useData()
  const [hhName, setHhName] = useState(data.household.name)
  const [income, setIncome] = useState<Income | 'new' | null>(null)
  const [cat, setCat] = useState<{ c: Category | null; type: CategoryType } | null>(null)

  async function saveName() {
    if (hhName.trim() && hhName !== data.household.name) {
      await supabase.from('households').update({ name: hhName.trim() }).eq('id', data.household.id); await reload()
    }
  }

  const section = (type: CategoryType, title: string, hint: string) => {
    const cats = data.categories.filter((c) => c.type === type && !c.archived)
    return (
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="section-title">{title}</p>
          {canManage && <button className="text-sm text-lime font-semibold" onClick={() => setCat({ c: null, type })}>+ Add</button>}
        </div>
        <div className="card !p-2">
          {cats.map((c) => (
            <button key={c.id} disabled={!canManage} onClick={() => setCat({ c, type })} className="w-full flex items-center gap-3 p-3 text-left">
              <Glyph name={c.icon} className="text-lime" /><span className="flex-1 font-medium">{c.name}{c.scope === 'business' && <BusinessTag />}</span>
              <span className="font-semibold">{c.monthly_budget ? peso(c.monthly_budget) : <span className="text-muted">—</span>}</span>
            </button>
          ))}
          {cats.length === 0 && <p className="text-sm text-muted p-3">None yet.</p>}
        </div>
        <p className="text-xs text-muted mt-2">{hint}</p>
      </section>
    )
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Budget setup" back />

      <section className="mb-6">
        <p className="section-title mb-2">Household</p>
        <div className="card space-y-3">
          <input className="field" value={hhName} disabled={!canManage} onChange={(e) => setHhName(e.target.value)} onBlur={saveName} />
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="section-title">Income</p>
          {canManage && <button className="text-sm text-lime font-semibold" onClick={() => setIncome('new')}>+ Add</button>}
        </div>
        <div className="card !p-2">
          {data.incomes.map((i) => {
            const varies = i.frequency === 'variable'
            const est = varies ? incomeEstimate(i, data, new Date()) : null
            return (
              <button key={i.id} disabled={!canManage} onClick={() => setIncome(i)} className="w-full flex items-center gap-3 p-3 text-left">
                <Glyph name={varies ? 'chart' : 'coins'} className="text-lime" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{i.source} · {data.members.find((m) => m.id === i.member_id)?.name ?? '—'}</span>
                  <span className="block text-xs text-muted">
                    {i.scope === 'business' && <><b className="text-lime font-semibold">Business</b> · </>}
                    {varies
                      ? est!.learned ? `Varies · last 3 months ${peso(est!.low)}–${peso(est!.high)}` : 'Varies · estimate until you record income'
                      : `${peso(i.amount)} · ${payLabel[i.frequency as PaySchedule]}`}
                  </span>
                </span>
                <span className="font-semibold">{varies ? '≈ ' : ''}{peso(Math.round(varies ? est!.amount : toMonthly(i.amount, i.frequency)))}<span className="text-xs text-muted">/mo</span></span>
              </button>
            )
          })}
          <div className="flex justify-between p-3 border-t border-line text-sm"><span className="text-muted">Expected per month</span><b>{peso(Math.round(plan.income))}</b></div>
        </div>
      </section>

      <Link to="/bills" className="card flex items-center justify-between mb-6">
        <span><span className="flex items-center gap-2 font-semibold"><Glyph name="receipt" size={18} className="text-lime" />Fixed bills</span><span className="text-sm text-muted">{peso(plan.fixed)} per month</span></span>
        <IconChevron className="text-muted" />
      </Link>

      {section('other', 'Everyday spending budgets', 'Tipid compares your actual spending against these, and uses them for goal suggestions until you have 1 month of history.')}
      {section('emergency', 'Emergency categories', 'For unplanned costs. Pay from your emergency fund when possible.')}

      {income && <IncomeForm income={income === 'new' ? null : income} onClose={() => setIncome(null)} />}
      {cat && <CategoryForm open type={cat.type} category={cat.c} onClose={() => setCat(null)} />}
    </div>
  )
}

function BusinessTag() {
  return <span className="ml-2 text-xs font-semibold text-lime">Business</span>
}

function IncomeForm({ income, onClose }: { income: Income | null; onClose: () => void }) {
  const { data, me, reload } = useData()
  const [source, setSource] = useState(income?.source ?? 'Salary')
  const [memberId, setMemberId] = useState(income?.member_id ?? me?.id ?? null)
  const [amount, setAmount] = useState<number | ''>(income?.amount ?? '')
  const [freq, setFreq] = useState<IncomeFrequency>(income?.frequency ?? data.household.pay_schedule)
  const varies = freq === 'variable'
  const [lastFixed, setLastFixed] = useState<PaySchedule>(income && income.frequency !== 'variable' ? income.frequency : data.household.pay_schedule)
  const [scope, setScope] = useState<Scope>(income?.scope ?? 'family')
  const [error, setError] = useState('')

  async function save() {
    const row = { source: source.trim() || 'Salary', member_id: memberId, amount: n(amount), frequency: freq, scope }
    const { error } = income
      ? await supabase.from('incomes').update(row).eq('id', income.id)
      : await supabase.from('incomes').insert({ ...row, household_id: data.household.id })
    if (error) return setError(error.message)
    await reload(); onClose()
  }
  async function remove() {
    if (!income || !confirm('Remove this income?')) return
    await supabase.from('incomes').delete().eq('id', income.id); await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={income ? 'Edit income' : 'Add income'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button className={`card !p-3 text-left border-2 ${!varies ? 'border-lime' : 'border-transparent'}`} onClick={() => { setFreq(lastFixed); if (source === 'Business') setSource('Salary') }}>
            <Glyph name="coins" className={!varies ? 'text-lime' : 'text-muted'} /><p className="font-semibold mt-2 text-sm">Fixed</p><p className="text-xs text-muted">Salary, pension, allowance</p>
          </button>
          <button className={`card !p-3 text-left border-2 ${varies ? 'border-lime' : 'border-transparent'}`} onClick={() => { setFreq('variable'); if (source === 'Salary') setSource('Business') }}>
            <Glyph name="chart" className={varies ? 'text-lime' : 'text-muted'} /><p className="font-semibold mt-2 text-sm">Varies</p><p className="text-xs text-muted">Business, projects, commissions</p>
          </button>
        </div>
        <div><label className="label">Name</label><input className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder={varies ? 'Sari-sari store, freelance projects…' : 'Salary, pension…'} /></div>
        <div><label className="label">Who earns it?</label>
          <div className="flex flex-wrap gap-2">
            {data.members.filter((m) => m.role !== 'child').map((m) => (
              <button key={m.id} className={`chip ${memberId === m.id ? 'chip-on' : ''}`} onClick={() => setMemberId(m.id)}>{m.name}</button>
            ))}
          </div></div>
        {varies ? (
          <div><label className="label">In a typical month, about how much do you earn?</label><MoneyInput value={amount} onChange={setAmount} />
            <p className="text-xs text-muted mt-1.5">Just an estimate. Record money when it comes in (➕ → Income) and Tipid will use your real 3-month average instead.</p></div>
        ) : (
          <>
            <div><label className="label">How often?</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(payLabel) as PaySchedule[]).map((p) => (
                  <button key={p} className={`chip ${freq === p ? 'chip-on' : ''}`} onClick={() => { setFreq(p); setLastFixed(p) }}>{payLabel[p]}</button>
                ))}
              </div></div>
            <div><label className="label">Amount each time (take-home)</label><MoneyInput value={amount} onChange={setAmount} /></div>
            {n(amount) > 0 && <p className="text-sm text-muted">= {peso(Math.round(toMonthly(n(amount), freq)))} per month</p>}
          </>
        )}
        <div><label className="label">Whose money is this?</label>
          <div className="flex gap-2">
            {(['family', 'business'] as const).map((s) => (
              <button key={s} className={`chip flex-1 justify-center capitalize ${scope === s ? 'chip-on' : ''}`} onClick={() => setScope(s)}>{s}</button>
            ))}
          </div></div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-3">
          {income && <button className="btn-ghost !text-danger" onClick={remove}>Remove</button>}
          <button className="btn-primary flex-1" disabled={!varies && n(amount) <= 0} onClick={save}><IconPlus size={16} />Save</button>
        </div>
      </div>
    </Sheet>
  )
}
