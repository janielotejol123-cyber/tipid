import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { IconBackspace, IconClose } from '../components/icons'
import { ErrorText } from '../components/ui'
import { useData } from '../lib/household'
import { peso, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { TxKind } from '../lib/types'

const KINDS: { id: TxKind; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'saving', label: 'Savings' },
  { id: 'income', label: 'Extra income' },
]

/** GoTyme-style "send money" screen: big amount, keypad, then details. */
export default function Add() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { data, me, reload } = useData()

  const [kind, setKind] = useState<TxKind>((params.get('kind') as TxKind) || 'expense')
  const [raw, setRaw] = useState('')
  const [step, setStep] = useState<'amount' | 'details'>('amount')
  const [categoryId, setCategoryId] = useState<string | null>(params.get('category'))
  const [goalId, setGoalId] = useState<string | null>(params.get('goal'))
  const [memberId, setMemberId] = useState<string | null>(me?.id ?? null)
  const [date, setDate] = useState(ymd(new Date()))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const amount = Number(raw || 0)
  const close = () => ((window.history.state?.idx ?? 0) > 0 ? nav(-1) : nav('/', { replace: true }))
  const cats = data.categories.filter((c) => !c.archived)
  const goals = data.goals.filter((g) => !g.archived)
  const groups = [
    { title: 'Fixed bills', items: cats.filter((c) => c.type === 'fixed') },
    { title: 'Everyday', items: cats.filter((c) => c.type === 'other') },
    { title: 'Emergency', items: cats.filter((c) => c.type === 'emergency') },
  ]

  function press(k: string) {
    if (k === 'del') return setRaw(raw.slice(0, -1))
    if (k === '.' && (raw.includes('.') || !raw)) return setRaw(raw.includes('.') ? raw : '0.')
    if (raw.includes('.') && raw.split('.')[1].length >= 2) return
    if (raw.replace('.', '').length >= 9) return
    if (raw === '0' && k !== '.') return setRaw(k)
    setRaw(raw + k)
  }

  const ready = kind === 'expense' ? !!categoryId : kind === 'saving' ? !!goalId : true

  async function save() {
    setBusy(true); setError('')
    const { data: tx, error } = await supabase.from('transactions').insert({
      household_id: data.household.id, member_id: memberId, kind, amount, date, note: note.trim() || null,
      category_id: kind === 'expense' ? categoryId : null, goal_id: kind === 'saving' ? goalId : null,
    }).select('id').single()
    if (error) { setBusy(false); return setError(error.message) }
    // Paying a fixed bill through Add also ticks it off in Bills
    const cat = cats.find((c) => c.id === categoryId)
    if (kind === 'expense' && cat?.type === 'fixed') {
      const month = date.slice(0, 7) + '-01'
      await supabase.from('bill_payments').upsert(
        { household_id: data.household.id, category_id: cat.id, month, transaction_id: tx.id },
        { onConflict: 'category_id,month', ignoreDuplicates: true })
    }
    await reload()
    close()
  }

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto p-5 md:py-10">
      <header className="flex items-center justify-between mb-4">
        <button onClick={() => (step === 'details' ? setStep('amount') : close())}
          className="size-10 rounded-full bg-surface flex items-center justify-center" aria-label="Close"><IconClose /></button>
        <div className="flex bg-surface rounded-full p-1">
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => setKind(k.id)}
              className={`px-3 h-8 rounded-full text-sm font-semibold transition ${kind === k.id ? 'bg-lime text-bg' : 'text-muted'}`}>{k.label}</button>
          ))}
        </div>
        <div className="size-10" />
      </header>

      {step === 'amount' ? (
        <>
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <p className="text-muted text-sm mb-2">{kind === 'expense' ? 'How much did you spend?' : kind === 'saving' ? 'How much are you saving?' : 'How much extra did you get?'}</p>
            <div className={`font-extrabold tracking-tight ${raw.length > 7 ? 'text-5xl' : 'text-6xl'} ${raw ? '' : 'text-muted'}`}>
              ₱{raw ? Number(raw.split('.')[0]).toLocaleString('en-PH') + (raw.includes('.') ? '.' + raw.split('.')[1] : '') : '0'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
              <button key={k} onClick={() => press(k)}
                className="h-16 rounded-2xl text-2xl font-semibold hover:bg-surface active:bg-surface-2 transition flex items-center justify-center">
                {k === 'del' ? <IconBackspace /> : k}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full mt-4" disabled={amount <= 0} onClick={() => setStep('details')}>Next</button>
        </>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-6">
            <div className="text-4xl font-extrabold">{peso(amount)}</div>
          </div>
          <div className="flex-1 space-y-6">
            {kind === 'expense' && groups.filter((g) => g.items.length).map((g) => (
              <div key={g.title}>
                <p className="label">{g.title}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((c) => (
                    <button key={c.id} className={`chip ${categoryId === c.id ? 'chip-on' : ''}`} onClick={() => setCategoryId(c.id)}>
                      <span>{c.icon}</span>{c.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {kind === 'saving' && (
              <div>
                <p className="label">Save to</p>
                {goals.length === 0 && <p className="text-sm text-muted">No goals yet — create one in Goals first.</p>}
                <div className="flex flex-wrap gap-2">
                  {goals.map((g) => (
                    <button key={g.id} className={`chip ${goalId === g.id ? 'chip-on' : ''}`} onClick={() => setGoalId(g.id)}>
                      <span>{g.emoji}</span>{g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {kind === 'income' && (
              <p className="text-sm text-muted card">Use this for <b className="text-ink">bonuses, sidelines or gifts</b>. Your regular salary is already counted from Budget settings.</p>
            )}
            {data.members.length > 1 && (
              <div>
                <p className="label">{kind === 'expense' ? 'Who spent it?' : 'Who?'}</p>
                <div className="flex flex-wrap gap-2">
                  {data.members.map((m) => (
                    <button key={m.id} className={`chip ${memberId === m.id ? 'chip-on' : ''}`} onClick={() => setMemberId(m.id)}>{m.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><p className="label">Date</p><input className="field" type="date" value={date} max={ymd(new Date())} onChange={(e) => setDate(e.target.value)} /></div>
              <div><p className="label">Note</p><input className="field" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            <ErrorText>{error}</ErrorText>
          </div>
          <button className="btn-primary w-full mt-6" disabled={!ready || busy} onClick={save}>
            {busy ? 'Saving…' : `Save ${peso(amount)}`}
          </button>
        </div>
      )}
    </div>
  )
}
