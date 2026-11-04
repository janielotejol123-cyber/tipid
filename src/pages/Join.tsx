import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ErrorText, Logo, Spinner } from '../components/ui'
import { useHousehold } from '../lib/household'
import { supabase } from '../lib/supabase'

interface Info { household_name: string; member_name: string | null; role: string }

export default function Join() {
  const { token = '' } = useParams()
  const nav = useNavigate()
  const { data, reload } = useHousehold()
  const [info, setInfo] = useState<Info | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('invite_info', { p_token: token }).then(({ data }) => {
      const row = (data as Info[] | null)?.[0] ?? null
      setInfo(row); if (row?.member_name) setName(row.member_name)
    })
  }, [token])

  async function accept() {
    setBusy(true); setError('')
    const { error } = await supabase.rpc('accept_invite', { p_token: token, p_name: name.trim() })
    if (error) { setBusy(false); return setError(error.message) }
    await reload(); nav('/', { replace: true })
  }

  if (info === undefined) return <Spinner />
  return (
    <div className="min-h-full max-w-sm mx-auto p-6 flex flex-col justify-center">
      <Logo className="text-4xl mb-8" />
      {!info ? (
        <>
          <h1 className="text-2xl font-bold">This invite link is no longer valid</h1>
          <p className="text-muted mt-2">It may have expired or already been used. Ask for a new link.</p>
          <button className="btn-ghost mt-6" onClick={() => nav('/')}>Go to Tipid</button>
        </>
      ) : data ? (
        <>
          <h1 className="text-2xl font-bold">You're already in a household</h1>
          <p className="text-muted mt-2">This account already belongs to “{data.household.name}”. Sign in with a different account to join “{info.household_name}”.</p>
          <button className="btn-ghost mt-6" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Join “{info.household_name}”</h1>
          <p className="text-muted mt-2">You'll share one budget and see the family's spending.</p>
          <div className="mt-6"><label className="label">Your name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} disabled={!!info.member_name} /></div>
          <div className="mt-4"><ErrorText>{error}</ErrorText></div>
          <button className="btn-primary mt-4" disabled={!name.trim() || busy} onClick={accept}>{busy ? 'Joining…' : 'Join household'}</button>
        </>
      )}
    </div>
  )
}
