import { useState } from 'react'
import CategoryForm from '../components/CategoryForm'
import Glyph from '../components/Glyph'
import MoneyInput, { n } from '../components/MoneyInput'
import { IconCheck, IconPlus } from '../components/icons'
import { Empty, ErrorText, PageHeader, Progress, Sheet } from '../components/ui'
import { useData } from '../lib/household'
import { monthName, monthStart, ord, peso, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/types'

export default function Bills() {
  const { data, me, canManage, reload } = useData()
  const [paying, setPaying] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const today = new Date()
  const monthKey = ymd(monthStart(today))
  const bills = data.categories.filter((c) => c.type === 'fixed' && !c.archived)
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))
  const payments = new Map(data.billPayments.filter((p) => p.month === monthKey).map((p) => [p.category_id, p]))
  const paidCount = bills.filter((b) => payments.has(b.id)).length
  const total = bills.reduce((a, b) => a + b.monthly_budget, 0)
  const paidTotal = bills.filter((b) => payments.has(b.id)).reduce((a, b) => {
    const p = payments.get(b.id)
    const tx = data.transactions.find((t) => t.id === p?.transaction_id)
    return a + (tx?.amount ?? b.monthly_budget)
  }, 0)

  async function undo(c: Category) {
    const p = payments.get(c.id)
    if (!p || !confirm(`Mark ${c.name} as unpaid? This also deletes its expense.`)) return
    await supabase.from('bill_payments').delete().eq('id', p.id)
    if (p.transaction_id) await supabase.from('transactions').delete().eq('id', p.transaction_id)
    await reload()
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Bills" back
        right={canManage && <button className="btn-ghost btn-sm" onClick={() => setEditing('new')}><IconPlus size={16} />Add</button>} />

      <section className="card mb-5">
        <div className="flex justify-between text-sm text-muted"><span>{monthName(today)}</span><span>{paidCount} of {bills.length} paid</span></div>
        <div className="text-3xl font-extrabold mt-1">{peso(paidTotal)} <span className="text-base text-muted font-medium">/ {peso(total)}</span></div>
        <Progress className="mt-3" value={total ? paidTotal / total : 0} />
      </section>

      <section className="card !p-2">
        {bills.length === 0 && <Empty icon="receipt" title="No fixed bills yet">Add rent, water, electricity and other monthly bills.</Empty>}
        {bills.map((b) => {
          const paid = payments.has(b.id)
          const late = !paid && b.due_day !== null && b.due_day < today.getDate()
          return (
            <div key={b.id} className="flex items-center gap-3 p-3">
              <button className="size-12 rounded-full bg-surface-2 text-lime flex items-center justify-center shrink-0"
                onClick={() => canManage && setEditing(b)}><Glyph name={b.icon} size={22} /></button>
              <div className="flex-1 min-w-0" onClick={() => canManage && setEditing(b)}>
                <p className="font-semibold truncate">{b.name}</p>
                <p className={`text-sm ${late ? 'text-danger' : 'text-muted'}`}>
                  {peso(b.monthly_budget)}{b.due_day ? ` · due ${ord(b.due_day)}` : ''}{late ? ' · overdue' : ''}
                </p>
              </div>
              {paid
                ? <button onClick={() => undo(b)} className="chip chip-on"><IconCheck size={16} />Paid</button>
                : <button onClick={() => setPaying(b)} className="btn-primary btn-sm">Pay</button>}
            </div>
          )
        })}
      </section>

      {paying && <PaySheet bill={paying} onClose={() => setPaying(null)} memberId={me?.id ?? null} householdId={data.household.id} monthKey={monthKey} reload={reload} />}
      {editing && <CategoryForm open type="fixed" category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function PaySheet({ bill, onClose, memberId, householdId, monthKey, reload }: {
  bill: Category; onClose: () => void; memberId: string | null; householdId: string; monthKey: string; reload: () => Promise<void>
}) {
  const [amount, setAmount] = useState<number | ''>(bill.monthly_budget || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    setBusy(true); setError('')
    const { data: tx, error } = await supabase.from('transactions').insert({
      household_id: householdId, member_id: memberId, kind: 'expense', category_id: bill.id, amount: n(amount), date: ymd(new Date()),
    }).select('id').single()
    if (error) { setBusy(false); return setError(error.message) }
    const { error: e2 } = await supabase.from('bill_payments').insert({ household_id: householdId, category_id: bill.id, month: monthKey, transaction_id: tx.id })
    setBusy(false)
    if (e2) return setError(e2.message)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`Pay ${bill.name}`}>
      <p className="text-sm text-muted mb-3">Bills can change every month (like electricity) — enter the actual amount.</p>
      <MoneyInput value={amount} onChange={setAmount} autoFocus />
      <div className="mt-4"><ErrorText>{error}</ErrorText></div>
      <button className="btn-primary w-full mt-4" disabled={n(amount) <= 0 || busy} onClick={pay}>
        {busy ? 'Saving…' : `Mark as paid · ${peso(n(amount))}`}
      </button>
    </Sheet>
  )
}
