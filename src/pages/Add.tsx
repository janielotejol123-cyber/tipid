import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Glyph from '../components/Glyph'
import { IconBackspace, IconClose, IconPlus } from '../components/icons'
import { ErrorText, Sheet } from '../components/ui'
import { useData } from '../lib/household'
import { peso, ymd } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { CategoryType, TxKind } from '../lib/types'

const KINDS: { id: TxKind; label: string }[] = [
  { id: 'expense', label: 'Expense' },
  { id: 'saving', label: 'Savings' },
  { id: 'income', label: 'Income' },
]

/** GoTyme-style "send money" screen: big amount, keypad, then details. */
export default function Add() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { data, me, canManage, reload } = useData()
  const [creating, setCreating] = useState<'category' | 'income' | 'person' | null>(null)

  const [kind, setKind] = useState<TxKind>((params.get('kind') as TxKind) || 'expense')
  const [raw, setRaw] = useState('')
  const [step, setStep] = useState<'amount' | 'details'>('amount')
  const [categoryId, setCategoryId] = useState<string | null>(params.get('category'))
  const [goalId, setGoalId] = useState<string | null>(params.get('goal'))
  const [memberId, setMemberId] = useState<string | null>(me?.id ?? null)
  const varSources = data.incomes.filter((i) => i.frequency === 'variable')
  const [incomeId, setIncomeId] = useState<string | null>(params.get('income') ?? varSources[0]?.id ?? null)
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
      ...(kind === 'income' && incomeId ? { income_id: incomeId } : {}),
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
            <p className="text-muted text-sm mb-2">{kind === 'expense' ? 'How much did you spend?' : kind === 'saving' ? 'How much are you saving?' : 'How much did you receive?'}</p>
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
            {kind === 'expense' && canManage && (
              <div className="-mb-3 flex justify-end">
                <button className="text-sm text-lime font-semibold flex items-center gap-1" onClick={() => setCreating('category')}><IconPlus size={16} />New category</button>
              </div>
            )}
            {kind === 'expense' && groups.filter((g) => g.items.length).map((g) => (
              <div key={g.title}>
                <p className="label">{g.title}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((c) => (
                    <button key={c.id} className={`chip ${categoryId === c.id ? 'chip-on' : ''}`} onClick={() => setCategoryId(c.id)}>
                      <Glyph name={c.icon} size={16} />{c.name}
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
                      <Glyph name={g.emoji} size={16} fallback="target" />{g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {kind === 'income' && (
              <div>
                <p className="label">Where is it from?</p>
                <div className="flex flex-wrap gap-2">
                  {varSources.map((i) => (
                    <button key={i.id} className={`chip ${incomeId === i.id ? 'chip-on' : ''}`}
                      onClick={() => { setIncomeId(i.id); if (i.member_id) setMemberId(i.member_id) }}>
                      <Glyph name="chart" size={16} />{i.source}
                    </button>
                  ))}
                  <button className={`chip ${incomeId === null ? 'chip-on' : ''}`} onClick={() => setIncomeId(null)}>
                    <Glyph name="gift" size={16} />Bonus / other
                  </button>
                  {canManage && <NewChip onClick={() => setCreating('income')}>New source</NewChip>}
                </div>
                <p className="text-xs text-muted mt-2">
                  {incomeId
                    ? 'Record each payment from your business or a project when you receive it.'
                    : 'For one-time money like bonuses, 13th month or gifts. Fixed salaries are already counted automatically.'}
                </p>
              </div>
            )}
            {(data.members.length > 1 || canManage) && (
              <div>
                <p className="label">{kind === 'expense' ? 'Who spent it?' : 'Who?'}</p>
                <div className="flex flex-wrap gap-2">
                  {data.members.map((m) => (
                    <button key={m.id} className={`chip ${memberId === m.id ? 'chip-on' : ''}`} onClick={() => setMemberId(m.id)}>{m.name}</button>
                  ))}
                  {canManage && <NewChip onClick={() => setCreating('person')}>New person</NewChip>}
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
      {creating && (
        <QuickCreate what={creating} householdId={data.household.id} memberId={memberId}
          onClose={() => setCreating(null)}
          onCreated={async (id) => {
            await reload()
            if (creating === 'category') setCategoryId(id)
            if (creating === 'income') setIncomeId(id)
            if (creating === 'person') setMemberId(id)
            setCreating(null)
          }} />
      )}
    </div>
  )
}

function NewChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="chip !bg-transparent border-dashed !border-line text-lime" onClick={onClick}>
      <IconPlus size={16} />{children}
    </button>
  )
}

/** Guess a fitting icon from the typed name */
const ICON_WORDS: [RegExp, string][] = [
  [/food|eat|meal|lunch|dinner|snack|milk ?tea|coffee|resto|jollibee|mcdo/i, 'utensils'],
  [/grocer|market|palengke|supermarket/i, 'cart'],
  [/grab|taxi|jeep|bus|fare|commute|transpo|mrt|lrt|tricycle/i, 'bus'],
  [/gas|fuel|diesel/i, 'fuel'], [/car|parking|toll/i, 'car'], [/motor/i, 'bike'],
  [/load|data|phone|mobile|globe|smart/i, 'phone'], [/internet|wifi|pldt|converge/i, 'wifi'],
  [/water/i, 'droplet'], [/electric|meralco|power/i, 'zap'], [/rent|house|condo|home/i, 'home'],
  [/school|tuition|book|project|allowance/i, 'backpack'], [/medic|doctor|hospital|check.?up|dental/i, 'medical'],
  [/medicine|vitamin|pharm|drug/i, 'pill'], [/pet|dog|cat|vet/i, 'paw'], [/baby|diaper|milk/i, 'baby'],
  [/gift|birthday|party|wedding/i, 'gift'], [/game|netflix|spotify|movie|stream/i, 'gamepad'],
  [/cloth|shop|lazada|shopee|mall/i, 'bag'], [/repair|fix|plumb/i, 'wrench'], [/loan|credit|card|debt/i, 'card'],
  [/salon|hair|haircut|barber|beauty/i, 'sparkles'], [/church|donat|charity/i, 'gift'],
]
const guessIcon = (name: string, fallback: string) => ICON_WORDS.find(([re]) => re.test(name))?.[1] ?? fallback

function QuickCreate({ what, householdId, memberId, onClose, onCreated }: {
  what: 'category' | 'income' | 'person'; householdId: string; memberId: string | null
  onClose: () => void; onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('other')
  const [adult, setAdult] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const title = what === 'category' ? 'New category' : what === 'income' ? 'New income source' : 'New person'
  const placeholder = what === 'category' ? 'e.g. Milk tea, Haircut, Pet food' : what === 'income' ? 'e.g. Online selling, Freelance project' : 'e.g. Lola, Tito Ben, Yaya'

  async function save() {
    setBusy(true); setError('')
    const n = name.trim()
    const q = what === 'category'
      ? supabase.from('categories').insert({ household_id: householdId, name: n, type, icon: guessIcon(n, type === 'fixed' ? 'receipt' : type === 'emergency' ? 'medical' : 'wallet'), monthly_budget: 0 })
      : what === 'income'
        ? supabase.from('incomes').insert({ household_id: householdId, member_id: memberId, source: n, amount: 0, frequency: 'variable' })
        : supabase.from('members').insert({ household_id: householdId, name: n, role: adult ? 'adult' : 'child' })
    const { data, error } = await q.select('id').single()
    setBusy(false)
    if (error) return setError(error.message)
    onCreated((data as { id: string }).id)
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {what === 'category' && <span className="size-12 rounded-2xl bg-surface-2 text-lime flex items-center justify-center shrink-0"><Glyph name={guessIcon(name, 'wallet')} size={22} /></span>}
          <input className="field" autoFocus value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) save() }} />
        </div>
        {what === 'category' && (
          <div className="flex gap-2">
            {([['other', 'Everyday'], ['fixed', 'Monthly bill'], ['emergency', 'Emergency']] as const).map(([t, l]) => (
              <button key={t} className={`chip flex-1 justify-center ${type === t ? 'chip-on' : ''}`} onClick={() => setType(t)}>{l}</button>
            ))}
          </div>
        )}
        {what === 'person' && (
          <>
            <div className="flex gap-2">
              <button className={`chip flex-1 justify-center ${adult ? 'chip-on' : ''}`} onClick={() => setAdult(true)}>Adult</button>
              <button className={`chip flex-1 justify-center ${!adult ? 'chip-on' : ''}`} onClick={() => setAdult(false)}>Child</button>
            </div>
            <p className="text-xs text-muted">They're added to Family without a login. You can invite adults to log in from the Family tab.</p>
          </>
        )}
        {what === 'income' && <p className="text-xs text-muted">Saved as income that varies (business, projects). Tipid learns its usual amount from what you record.</p>}
        {what === 'category' && <p className="text-xs text-muted">You can set a monthly budget for it later in Budget settings.</p>}
        <ErrorText>{error}</ErrorText>
        <button className="btn-primary w-full" disabled={!name.trim() || busy} onClick={save}>{busy ? 'Adding…' : 'Add and use'}</button>
      </div>
    </Sheet>
  )
}
