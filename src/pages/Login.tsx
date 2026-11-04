import { useState, type FormEvent } from 'react'
import { ErrorText, Logo } from '../components/ui'
import { supabase } from '../lib/supabase'
import { versionLabel } from '../lib/version'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const joining = location.pathname.startsWith('/join/')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.href } })
    setBusy(false)
    if (error) return setError(friendly(error.message))
    if (mode === 'up' && !data.session) setNotice('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="min-h-full flex flex-col md:items-center md:justify-center p-6">
      <div className="w-full md:max-w-sm mx-auto flex-1 md:flex-none flex flex-col">
        <div className="pt-10 md:pt-0 mb-10">
          <Logo className="text-4xl" />
          <h1 className="text-3xl font-bold mt-8 leading-tight">
            {joining ? 'Join your family on Tipid' : mode === 'in' ? 'Welcome back' : 'Know if your income is enough.'}
          </h1>
          <p className="text-muted mt-2">
            {joining ? 'Sign in or create an account to accept the invite.' : 'Track spending, bills and savings — together as a family.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input className="field" type="email" required autoComplete="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" type="password" required minLength={6} placeholder="Password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          {notice && <p className="text-sm text-lime bg-lime/10 rounded-2xl px-4 py-3">{notice}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6 md:mt-8 pb-6">
          {mode === 'in' ? "New to Tipid? " : 'Already have an account? '}
          <button className="text-lime font-semibold" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError('') }}>
            {mode === 'in' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <p className="text-center text-xs text-muted/60 pb-4">Tipid {versionLabel}</p>
      </div>
    </div>
  )
}

/** Turn Supabase auth errors into plain-English messages */
function friendly(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many sign-up emails were sent in the last hour. Please wait a bit and try again — or sign in if you already confirmed your email.'
  if (m.includes('already registered')) return 'This email already has an account. Sign in instead.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox (and spam) for the link from Tipid.'
  if (m.includes('invalid login')) return 'Wrong email or password.'
  return msg
}
