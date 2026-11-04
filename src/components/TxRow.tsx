import { GlyphBadge } from './Glyph'
import { isLateFee } from '../lib/budget'
import { peso, shortDate } from '../lib/money'
import type { Snapshot } from '../lib/budget'
import type { Transaction } from '../lib/types'

export default function TxRow({ tx, data, onClick }: { tx: Transaction; data: Snapshot; onClick?: () => void }) {
  const cat = tx.category_id ? data.categories.find((c) => c.id === tx.category_id) : null
  const goal = tx.goal_id ? data.goals.find((g) => g.id === tx.goal_id) : null
  const who = tx.member_id ? data.members.find((m) => m.id === tx.member_id) : null
  const isTransfer = tx.kind === 'transfer' || !!tx.transferred
  const icon = isTransfer ? 'family' : tx.kind === 'saving' ? goal?.emoji ?? 'piggy' : tx.kind === 'income' ? (tx.income_id ? 'chart' : 'coins') : cat?.icon ?? 'wallet'
  const title = isTransfer ? 'Transfer to family' : tx.kind === 'saving' ? `Saved · ${goal?.name ?? 'Goal'}` : tx.kind === 'income' ? (tx.income_id ? data.incomes.find((i) => i.id === tx.income_id)?.source ?? 'Income' : tx.note || 'Extra income') : isLateFee(tx) ? `${cat?.name ?? 'Bill'} · late fee` : cat?.name ?? 'Expense'
  // Income with a source uses the source as its title, so its note goes here; other income uses the note as the title
  const showNote = isTransfer || tx.kind === 'expense' ? !isLateFee(tx) : tx.kind === 'income' && !!tx.income_id
  const sub = [who?.name, shortDate(tx.date), showNote && tx.note].filter(Boolean).join(' · ')
  // A plain transfer is neither money in nor out for the whole household
  const sign = tx.kind === 'transfer' ? '' : tx.kind === 'expense' ? '−' : '+'
  const tone = tx.kind === 'expense' || tx.kind === 'transfer' ? '' : 'text-lime'
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <GlyphBadge name={icon} tone={isLateFee(tx) ? 'bg-danger/10 text-danger' : tx.kind === 'expense' || tx.kind === 'transfer' ? 'bg-surface-2 text-ink' : 'bg-lime/10 text-lime'} />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate">{title}</span>
        <span className="block text-sm text-muted truncate">{sub}</span>
      </span>
      <span className={`font-bold whitespace-nowrap ${tone}`}>{sign && `${sign} `}{peso(tx.amount)}</span>
    </button>
  )
}
