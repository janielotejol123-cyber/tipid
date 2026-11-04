import { GlyphBadge } from './Glyph'
import { peso, shortDate } from '../lib/money'
import type { Snapshot } from '../lib/budget'
import type { Transaction } from '../lib/types'

export default function TxRow({ tx, data, onClick }: { tx: Transaction; data: Snapshot; onClick?: () => void }) {
  const cat = tx.category_id ? data.categories.find((c) => c.id === tx.category_id) : null
  const goal = tx.goal_id ? data.goals.find((g) => g.id === tx.goal_id) : null
  const who = tx.member_id ? data.members.find((m) => m.id === tx.member_id) : null
  const icon = tx.kind === 'saving' ? goal?.emoji ?? 'piggy' : tx.kind === 'income' ? 'coins' : cat?.icon ?? 'wallet'
  const title = tx.kind === 'saving' ? `Saved · ${goal?.name ?? 'Goal'}` : tx.kind === 'income' ? tx.note || 'Extra income' : cat?.name ?? 'Expense'
  const sub = [who?.name, shortDate(tx.date), tx.kind === 'expense' && tx.note].filter(Boolean).join(' · ')
  const sign = tx.kind === 'expense' ? '−' : '+'
  const tone = tx.kind === 'expense' ? '' : 'text-lime'
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <GlyphBadge name={icon} tone={tx.kind === 'expense' ? 'bg-surface-2 text-ink' : 'bg-lime/10 text-lime'} />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate">{title}</span>
        <span className="block text-sm text-muted truncate">{sub}</span>
      </span>
      <span className={`font-bold whitespace-nowrap ${tone}`}>{sign} {peso(tx.amount)}</span>
    </button>
  )
}
