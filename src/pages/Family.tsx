import { useEffect, useState } from 'react'
import { IconPlus } from '../components/icons'
import { Avatar, ErrorText, PageHeader, Progress, Sheet } from '../components/ui'
import { useData } from '../lib/household'
import { monthName, peso } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Invite, Member, Role } from '../lib/types'

const roleLabel: Record<Role, string> = { owner: 'Owner', adult: 'Adult', teen: 'Teen (15+)', child: 'Child' }
const thisYear = new Date().getFullYear()

export default function Family() {
  const { data, me, thisMonth: m, canManage, reload } = useData()
  const [adding, setAdding] = useState(false)
  const [inviteFor, setInviteFor] = useState<Member | 'new' | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])

  useEffect(() => {
    if (!canManage) return
    supabase.from('invites').select('*').eq('household_id', data.household.id).is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()).then(({ data }) => setInvites((data as Invite[]) ?? []))
  }, [canManage, data.household.id, inviteFor])

  const spentBy = new Map(m.byMember.map((x) => [x.member?.id ?? null, x.amount]))
  const max = Math.max(1, ...m.byMember.map((x) => x.amount))
  const incomeBy = (id: string) => data.incomes.filter((i) => i.member_id === id).length > 0

  return (
    <div className="max-w-2xl">
      <PageHeader title="Family"
        right={canManage && <button className="btn-ghost btn-sm" onClick={() => setAdding(true)}><IconPlus size={16} />Add</button>} />

      <p className="section-title mb-3">Spending in {monthName(new Date())}</p>
      <section className="card !p-2 mb-6">
        {data.members.map((mem) => {
          const spent = spentBy.get(mem.id) ?? 0
          const age = mem.birth_year ? thisYear - mem.birth_year : null
          const canLogin = mem.role !== 'child' && !mem.user_id
          return (
            <div key={mem.id} className="p-3">
              <div className="flex items-center gap-3">
                <Avatar name={mem.name} tone={mem.id === me?.id ? 'bg-lime text-bg' : 'bg-surface-2'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{mem.name}{mem.id === me?.id && <span className="text-muted font-normal"> (you)</span>}</p>
                  <p className="text-xs text-muted">
                    {roleLabel[mem.role]}{age !== null ? ` · ${age} yrs` : ''}{incomeBy(mem.id) ? ' · earner' : ''}
                    {!mem.user_id && mem.role !== 'child' ? ' · no login yet' : ''}
                  </p>
                </div>
                <span className="font-bold">{peso(Math.round(spent))}</span>
              </div>
              <Progress className="mt-3 ml-[52px]" value={spent / max} />
              {canManage && canLogin && (
                <button className="ml-[52px] mt-2 text-sm text-lime font-semibold" onClick={() => setInviteFor(mem)}>Invite {mem.name} to log in →</button>
              )}
            </div>
          )
        })}
        {spentBy.get(null) ? (
          <div className="p-3 flex justify-between text-sm text-muted"><span>Not assigned</span><span>{peso(spentBy.get(null)!)}</span></div>
        ) : null}
      </section>

      {canManage && (
        <>
          <button className="btn-ghost w-full mb-6" onClick={() => setInviteFor('new')}>Invite someone new</button>
          {invites.length > 0 && (
            <>
              <p className="section-title mb-3">Pending invites</p>
              <section className="card space-y-2 text-sm">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{data.members.find((x) => x.id === i.member_id)?.name ?? i.email ?? 'New member'} · {i.role}</span>
                    <CopyLink token={i.token} small />
                  </div>
                ))}
              </section>
            </>
          )}
        </>
      )}

      <p className="text-xs text-muted mt-6">Kids under 15 don't get a login — a parent adds their expenses and picks them under “Who spent it?”.</p>

      {adding && <AddMember onClose={() => setAdding(false)} householdId={data.household.id} reload={reload} />}
      {inviteFor && <InviteSheet member={inviteFor === 'new' ? null : inviteFor} householdId={data.household.id} onClose={() => setInviteFor(null)} />}
    </div>
  )
}

function AddMember({ onClose, householdId, reload }: { onClose: () => void; householdId: string; reload: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'adult' | 'kid'>('kid')
  const [birthYear, setBirthYear] = useState<number | ''>('')
  const [error, setError] = useState('')
  const role: Role = kind === 'adult' ? 'adult' : birthYear !== '' && thisYear - birthYear >= 15 ? 'teen' : 'child'

  async function save() {
    const { error } = await supabase.from('members').insert({ household_id: householdId, name: name.trim(), role, birth_year: birthYear || null })
    if (error) return setError(error.message)
    await reload(); onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Add family member">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button className={`chip flex-1 justify-center ${kind === 'adult' ? 'chip-on' : ''}`} onClick={() => setKind('adult')}>Adult</button>
          <button className={`chip flex-1 justify-center ${kind === 'kid' ? 'chip-on' : ''}`} onClick={() => setKind('kid')}>Child</button>
        </div>
        <div><label className="label">Name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {kind === 'kid' && (
          <div><label className="label">Birth year</label>
            <input className="field" type="number" inputMode="numeric" value={birthYear} placeholder="e.g. 2010"
              onChange={(e) => setBirthYear(e.target.value === '' ? '' : Number(e.target.value))} />
            <p className="text-xs text-muted mt-1.5">{role === 'teen' ? '15 or older — can be invited to log in.' : 'Under 15 — a parent logs their spending.'}</p>
          </div>
        )}
        <ErrorText>{error}</ErrorText>
        <button className="btn-primary w-full" disabled={!name.trim()} onClick={save}>Add {roleLabelShort(role)}</button>
      </div>
    </Sheet>
  )
}
const roleLabelShort = (r: Role) => (r === 'adult' ? 'adult' : r === 'teen' ? 'teen' : 'child')

function InviteSheet({ member, householdId, onClose }: { member: Member | null; householdId: string; onClose: () => void }) {
  const [role, setRole] = useState<'adult' | 'teen'>(member?.role === 'teen' ? 'teen' : 'adult')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  async function create() {
    const { data, error } = await supabase.from('invites')
      .insert({ household_id: householdId, member_id: member?.id ?? null, role: member ? (member.role === 'teen' ? 'teen' : 'adult') : role })
      .select('token').single()
    if (error) return setError(error.message)
    setToken(data.token)
  }

  return (
    <Sheet open onClose={onClose} title={member ? `Invite ${member.name}` : 'Invite someone'}>
      {!token ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">You'll get a link to send by Messenger, Viber or SMS. It works for 7 days.</p>
          {!member && (
            <div className="flex gap-2">
              <button className={`chip flex-1 justify-center ${role === 'adult' ? 'chip-on' : ''}`} onClick={() => setRole('adult')}>Adult</button>
              <button className={`chip flex-1 justify-center ${role === 'teen' ? 'chip-on' : ''}`} onClick={() => setRole('teen')}>Teen (15+)</button>
            </div>
          )}
          <p className="text-xs text-muted">{(member?.role ?? role) === 'teen' ? 'Teens can add their own expenses and savings, and see the family budget.' : 'Adults can see and manage everything.'}</p>
          <ErrorText>{error}</ErrorText>
          <button className="btn-primary w-full" onClick={create}>Create invite link</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Send this link. They sign up, then join your household.</p>
          <div className="field !h-auto py-3 break-all text-sm">{`${location.origin}/join/${token}`}</div>
          <CopyLink token={token} />
        </div>
      )}
    </Sheet>
  )
}

function CopyLink({ token, small }: { token: string; small?: boolean }) {
  const [done, setDone] = useState(false)
  const url = `${location.origin}/join/${token}`
  async function copy() {
    if (navigator.share && !small) { try { await navigator.share({ title: 'Join our family on Tipid', url }); return } catch { /* fall back to copy */ } }
    await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500)
  }
  return <button className={small ? 'text-lime font-semibold shrink-0' : 'btn-primary w-full'} onClick={copy}>{done ? 'Copied!' : small ? 'Copy link' : 'Share link'}</button>
}
