import { useState } from 'react'
import CategoryForm from '../components/CategoryForm'
import Glyph from '../components/Glyph'
import MoneyInput, { n } from '../components/MoneyInput'
import { IconCheck, IconPlus } from '../components/icons'
import { Empty, ErrorText, PageHeader, Progress, Sheet } from '../components/ui'
import { LATE_FEE, isLateFee, type BillEstimate } from '../lib/budget'
import { useData } from '../lib/household'
import { monthName, monthStart, ord, peso, sameMonth, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { BillPayment, Category, Transaction } from '../lib/types'

export default function Bills() {
  const { data, me, thisMonth, canManage, reload } = useData()
  const [paying, setPaying] = useState<Category | null>(null)
  const [viewing, setViewing] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const today = new Date()
  const monthKey = ymd(monthStart(today))
  const bills = data.categories.filter((c) => c.type === 'fixed' && !c.archived)
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))
  const payments = new Map(data.billPayments.filter((p) => p.month === monthKey).map((p) => [p.category_id, p]))
  const est = (c: Category) => thisMonth.estimates.get(c.id) ?? { amount: c.monthly_budget, learned: false, varies: false, low: 0, high: 0 }
  const paidTx = (c: Category) => data.transactions.find((t) => t.id === payments.get(c.id)?.transaction_id)
  const feesFor = (c: Category) => data.transactions.filter((t) => t.category_id === c.id && isLateFee(t) && sameMonth(t.date, today))

  const paidCount = bills.filter((b) => payments.has(b.id)).length
  const expected = bills.reduce((a, b) => a + (payments.has(b.id) ? paidTx(b)?.amount ?? est(b).amount : est(b).amount), 0)
  const paidTotal = bills.filter((b) => payments.has(b.id)).reduce((a, b) => a + (paidTx(b)?.amount ?? est(b).amount), 0)
  const fees = thisMonth.lateFees

  return (
    <div className="max-w-2xl">
      <PageHeader title="Bills" back
        right={canManage && <button className="btn-ghost btn-sm" onClick={() => setEditing('new')}><IconPlus size={16} />Add</button>} />

      <section className="card mb-5">
        <div className="flex justify-between text-sm text-muted"><span>{monthName(today)}</span><span>{paidCount} of {bills.length} paid</span></div>
        <div className="text-3xl font-extrabold mt-1">{peso(paidTotal)} <span className="text-base text-muted font-medium">/ ≈ {peso(expected)}</span></div>
        <Progress className="mt-3" value={expected ? paidTotal / expected : 0} />
        {fees > 0 && (
          <p className="text-sm text-danger mt-3 flex items-center gap-2"><Glyph name="stop" size={16} />{peso(fees)} in late fees this month</p>
        )}
      </section>

      <section className="card !p-2">
        {bills.length === 0 && <Empty icon="receipt" title="No fixed bills yet">Add rent, water, electricity and other monthly bills.</Empty>}
        {bills.map((b) => {
          const paid = payments.has(b.id)
          const e = est(b)
          const late = !paid && b.due_day !== null && b.due_day < today.getDate()
          const tx = paidTx(b)
          const fee = feesFor(b).reduce((a, t) => a + t.amount, 0)
          const diff = tx && e.learned ? tx.amount - e.amount : 0
          return (
            <div key={b.id} className="flex items-center gap-3 p-3">
              <button className="size-12 rounded-full bg-surface-2 text-lime flex items-center justify-center shrink-0"
                onClick={() => canManage && setEditing(b)}><Glyph name={b.icon} size={22} /></button>
              <div className="flex-1 min-w-0" onClick={() => canManage && setEditing(b)}>
                <p className="font-semibold truncate">{b.name}</p>
                {paid ? (
                  <p className="text-sm text-muted">
                    Paid {peso(tx?.amount ?? e.amount)}
                    {Math.abs(diff) >= 1 && <span className={diff > 0 ? 'text-warn' : 'text-lime'}> · {peso(Math.abs(diff))} {diff > 0 ? 'more' : 'less'} than usual</span>}
                    {fee > 0 && <span className="text-danger"> · +{peso(fee)} late fee</span>}
                  </p>
                ) : (
                  <p className={`text-sm ${late ? 'text-danger' : 'text-muted'}`}>
                    {e.varies ? `≈ ${peso(e.amount)} avg` : peso(e.amount)}
                    {b.due_day ? ` · due ${ord(b.due_day)}` : ''}{late ? ' · overdue' : ''}
                  </p>
                )}
                {!paid && e.varies && <p className="text-xs text-muted">Last 3 months: {peso(e.low)}–{peso(e.high)}</p>}
              </div>
              {paid
                ? <button onClick={() => setViewing(b)} className="chip chip-on"><IconCheck size={16} />Paid</button>
                : <button onClick={() => setPaying(b)} className="btn-primary btn-sm">Pay</button>}
            </div>
          )
        })}
      </section>

      <p className="text-xs text-muted mt-4">
        Bills that change (electricity, water) are estimated from what you actually paid in the last 3 months. Late fees are tracked separately so you can see what penalties cost you.
      </p>

      {paying && <PaySheet bill={paying} estimate={est(paying)} overdue={!!paying.due_day && paying.due_day < today.getDate()}
        onClose={() => setPaying(null)} memberId={me?.id ?? null} householdId={data.household.id} monthKey={monthKey} reload={reload} />}
      {viewing && payments.get(viewing.id) && <PaidSheet bill={viewing} payment={payments.get(viewing.id)!} tx={paidTx(viewing)} fees={feesFor(viewing)}
        onClose={() => setViewing(null)} memberId={me?.id ?? null} householdId={data.household.id} reload={reload} />}
      {editing && <CategoryForm open type="fixed" category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

async function addLateFee(householdId: string, memberId: string | null, bill: Category, amount: number) {
  return supabase.from('transactions').insert({
    household_id: householdId, member_id: memberId, kind: 'expense', category_id: bill.id, amount, date: ymd(new Date()), note: LATE_FEE,
  })
}

function PaySheet({ bill, estimate, overdue, onClose, memberId, householdId, monthKey, reload }: {
  bill: Category; estimate: BillEstimate; overdue: boolean; onClose: () => void
  memberId: string | null; householdId: string; monthKey: string; reload: () => Promise<void>
}) {
  const [amount, setAmount] = useState<number | ''>(estimate.amount || '')
  const [showFee, setShowFee] = useState(overdue)
  const [fee, setFee] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const total = n(amount) + (showFee ? n(fee) : 0)

  async function pay() {
    setBusy(true); setError('')
    const { data: tx, error } = await supabase.from('transactions').insert({
      household_id: householdId, member_id: memberId, kind: 'expense', category_id: bill.id, amount: n(amount), date: ymd(new Date()),
    }).select('id').single()
    if (error) { setBusy(false); return setError(error.message) }
    const { error: e2 } = await supabase.from('bill_payments').insert({ household_id: householdId, category_id: bill.id, month: monthKey, transaction_id: tx.id })
    if (e2) { setBusy(false); return setError(e2.message) }
    if (showFee && n(fee) > 0) {
      const { error: e3 } = await addLateFee(householdId, memberId, bill, n(fee))
      if (e3) { setBusy(false); return setError(e3.message) }
    }
    setBusy(false)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`Pay ${bill.name}`}>
      <label className="label">Amount on the bill</label>
      <MoneyInput value={amount} onChange={setAmount} autoFocus />
      <p className="text-xs text-muted mt-2">
        {estimate.varies
          ? `This bill changes — you paid ${peso(estimate.low)}–${peso(estimate.high)} in the last 3 months. Enter this month's actual amount.`
          : estimate.learned ? `Usually ${peso(estimate.amount)}. Change it if this month is different.`
          : 'Enter the actual amount — it can be different every month.'}
      </p>

      <div className="mt-5">
        {showFee ? (
          <>
            <label className="label flex items-center gap-2 !text-danger"><Glyph name="stop" size={16} />Late fee / penalty</label>
            <MoneyInput value={fee} onChange={setFee} />
            <p className="text-xs text-muted mt-2">{overdue ? 'This bill is past its due date. ' : ''}Leave it empty if there's no penalty. It's saved separately so you can see what late payments cost.</p>
          </>
        ) : (
          <button className="text-sm text-lime font-semibold flex items-center gap-1.5" onClick={() => setShowFee(true)}>
            <IconPlus size={16} />Add late fee / penalty
          </button>
        )}
      </div>

      <div className="mt-4"><ErrorText>{error}</ErrorText></div>
      <button className="btn-primary w-full mt-4" disabled={n(amount) <= 0 || busy} onClick={pay}>
        {busy ? 'Saving…' : `Mark as paid · ${peso(total)}`}
      </button>
    </Sheet>
  )
}

/** Paid bill: see what was paid, add a late fee that came later, or undo. */
function PaidSheet({ bill, payment, tx, fees, onClose, memberId, householdId, reload }: {
  bill: Category; payment: BillPayment; tx: Transaction | undefined; fees: Transaction[]; onClose: () => void
  memberId: string | null; householdId: string; reload: () => Promise<void>
}) {
  const [fee, setFee] = useState<number | ''>('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const feeTotal = fees.reduce((a, t) => a + t.amount, 0)

  async function saveFee() {
    setBusy(true); setError('')
    const { error } = await addLateFee(householdId, memberId, bill, n(fee))
    setBusy(false)
    if (error) return setError(error.message)
    await reload(); onClose()
  }

  async function undo() {
    if (!confirm(`Mark ${bill.name} as unpaid? This deletes its payment${fees.length ? ' and late fee' : ''} for this month.`)) return
    setBusy(true)
    await supabase.from('bill_payments').delete().eq('id', payment.id)
    if (payment.transaction_id) await supabase.from('transactions').delete().eq('id', payment.transaction_id)
    for (const f of fees) await supabase.from('transactions').delete().eq('id', f.id)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={bill.name}>
      <dl className="space-y-3 text-sm mb-5">
        <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-semibold">{peso(tx?.amount ?? 0)}</dd></div>
        {feeTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Late fee</dt><dd className="font-semibold text-danger">+ {peso(feeTotal)}</dd></div>}
        <div className="flex justify-between border-t border-line pt-3"><dt className="text-muted">Total</dt><dd className="font-bold">{peso((tx?.amount ?? 0) + feeTotal)}</dd></div>
      </dl>

      {adding ? (
        <div className="space-y-3">
          <label className="label flex items-center gap-2 !text-danger"><Glyph name="stop" size={16} />Late fee / penalty</label>
          <MoneyInput value={fee} onChange={setFee} autoFocus />
          <button className="btn-primary w-full" disabled={n(fee) <= 0 || busy} onClick={saveFee}>Save late fee · {peso(n(fee))}</button>
        </div>
      ) : (
        <button className="btn-ghost w-full" onClick={() => setAdding(true)}><IconPlus size={16} />Add late fee / penalty</button>
      )}
      <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      <button className="btn-ghost w-full !text-danger mt-3" disabled={busy} onClick={undo}>Mark as unpaid</button>
    </Sheet>
  )
}
