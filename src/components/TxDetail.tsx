import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/household'
import { peso, shortDate } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../lib/types'
import Glyph from './Glyph'
import { IconTrash } from './icons'
import { ErrorText, Sheet } from './ui'

export default function TxDetail({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const { data, canManage, reload } = useData()
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!tx) return null
  const cat = data.categories.find((c) => c.id === tx.category_id)
  const goal = data.goals.find((g) => g.id === tx.goal_id)
  const who = data.members.find((m) => m.id === tx.member_id)
  const mine = tx.created_by === session?.user.id
  const isTransfer = tx.kind === 'transfer' || !!tx.transferred
  const kindLabel = isTransfer ? 'Transfer to family' : { expense: 'Expense', income: 'Extra income', saving: 'Savings', transfer: '' }[tx.kind]

  async function remove() {
    if (!confirm('Delete this transaction?')) return
    setBusy(true); setError('')
    // If it paid a bill, un-mark the bill too
    await supabase.from('bill_payments').delete().eq('transaction_id', tx!.id)
    const { error } = await supabase.from('transactions').delete().eq('id', tx!.id)
    setBusy(false)
    if (error) return setError(error.message)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title={kindLabel}>
      <div className="text-4xl font-extrabold mb-5">{tx.kind === 'transfer' ? '' : tx.kind === 'expense' ? '− ' : '+ '}{peso(tx.amount)}</div>
      <dl className="space-y-3 text-sm mb-6">
        {cat && <Row k="Category" v={<span className="inline-flex items-center gap-1.5"><Glyph name={cat.icon} size={16} />{cat.name}</span>} />}
        {goal && <Row k="Goal" v={<span className="inline-flex items-center gap-1.5"><Glyph name={goal.emoji} size={16} fallback="target" />{goal.name}</span>} />}
        <Row k="Who" v={who?.name ?? '—'} />
        <Row k="Date" v={shortDate(tx.date)} />
        {tx.note && <Row k="Note" v={tx.note} />}
      </dl>
      <ErrorText>{error}</ErrorText>
      {(canManage || mine) && (
        <button className="btn-ghost w-full !text-danger mt-3" disabled={busy} onClick={remove}><IconTrash size={18} /> Delete</button>
      )}
    </Sheet>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="font-semibold text-right">{v}</dd></div>
}
