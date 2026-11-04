import { useState } from 'react'
import { useData } from '../lib/household'
import { supabase } from '../lib/supabase'
import type { Category, CategoryType, Scope } from '../lib/types'
import Glyph, { CATEGORY_ICONS, glyphKey } from './Glyph'
import MoneyInput, { n } from './MoneyInput'
import { ErrorText, Sheet } from './ui'


/** Add or edit a category / bill. `category` null = new. */
export default function CategoryForm({ open, onClose, category, type }: {
  open: boolean; onClose: () => void; category: Category | null; type: CategoryType
}) {
  const { data, reload } = useData()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category ? glyphKey(category.icon) : type === 'fixed' ? 'home' : type === 'emergency' ? 'medical' : 'wallet')
  const [budget, setBudget] = useState<number | ''>(category?.monthly_budget ?? '')
  const [due, setDue] = useState<number | ''>(category?.due_day ?? '')
  const [scope, setScope] = useState<Scope>(category?.scope ?? 'family')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true); setError('')
    const row = { name: name.trim(), icon, monthly_budget: n(budget), due_day: type === 'fixed' ? due || null : null, scope }
    const { error } = category
      ? await supabase.from('categories').update(row).eq('id', category.id)
      : await supabase.from('categories').insert({ ...row, type, household_id: data.household.id })
    setBusy(false)
    if (error) return setError(error.message)
    await reload(); onClose()
  }

  async function archive() {
    if (!category || !confirm(`Remove "${category.name}"? Past transactions are kept.`)) return
    await supabase.from('categories').update({ archived: true }).eq('id', category.id)
    await reload(); onClose()
  }

  const word = type === 'fixed' ? 'bill' : 'category'
  return (
    <Sheet open={open} onClose={onClose} title={category ? `Edit ${word}` : `New ${word}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICONS.map((i) => (
            <button key={i} onClick={() => setIcon(i)} aria-label={i}
              className={`size-10 rounded-xl flex items-center justify-center ${icon === i ? 'bg-lime/20 ring-2 ring-lime text-lime' : 'bg-surface-2 text-muted'}`}><Glyph name={i} /></button>
          ))}
        </div>
        <div><label className="label">Name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">{type === 'fixed' ? 'Usual amount per month' : 'Monthly budget'}</label>
          <MoneyInput value={budget} onChange={setBudget} />
          {type === 'fixed' && <p className="text-xs text-muted mt-1.5">If it changes every month (electricity, water), enter a typical amount. Tipid learns the real average from what you pay.</p>}</div>
        {type === 'fixed' && (
          <div><label className="label">Due day of the month</label>
            <input className="field" type="number" inputMode="numeric" min={1} max={31} value={due}
              onChange={(e) => setDue(e.target.value === '' ? '' : Math.min(31, Math.max(1, Number(e.target.value))))} /></div>
        )}
        <div><label className="label">Whose money is this?</label>
          <div className="flex gap-2">
            {(['family', 'business'] as const).map((s) => (
              <button key={s} className={`chip flex-1 justify-center capitalize ${scope === s ? 'chip-on' : ''}`} onClick={() => setScope(s)}>{s}</button>
            ))}
          </div></div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-3 pt-2">
          {category && <button className="btn-ghost !text-danger" onClick={archive}>Remove</button>}
          <button className="btn-primary flex-1" disabled={!name.trim() || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Sheet>
  )
}
