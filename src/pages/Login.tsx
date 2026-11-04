import { useState, type FormEvent } from 'react'
import PasswordField from '../components/PasswordField'
import { ErrorText, Logo } from '../components/ui'
import { supabase } from '../lib/supabase'
import { versionLabel } from '../lib/version'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => (location.hash.includes('error_code=otp_expired') ? 'That reset link has expired or was already used. Please ask for a new one.' : ''))
  const [notice, setNotice] = useState('')
  const joining = location.pathname.startsWith('/join/')

  function switchMode(next: typeof mode) {
    setMode(next); setError(''); setNotice('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    setShowPassword(false)
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
      if (error) console.error('Password reset request failed', error.message)
      setBusy(false)
      // Same reply every time, so this form can't be used to find out who has an account
      return setNotice('If that email has an account, a reset link is on its way. Check your spam folder too. The link works for 1 hour.')
    }
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
            {mode === 'forgot' ? 'Reset your password' : joining ? 'Join your family on Tipid' : mode === 'in' ? 'Welcome back' : 'Know if your income is enough.'}
          </h1>
          <p className="text-muted mt-2">
            {mode === 'forgot' ? "Enter your email and we'll send you a link to set a new password." : joining ? 'Sign in or create an account to accept the invite.' : 'Track spending, bills and savings — together as a family.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input className="field" type="email" required autoComplete="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== 'forgot' && (
            <PasswordField required minLength={6} placeholder="Password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} shown={showPassword} onShownChange={setShowPassword} />
          )}
          {mode === 'in' && (
            <div className="text-right">
              <button type="button" className="text-sm text-muted font-semibold py-1" onClick={() => switchMode('forgot')}>Forgot password?</button>
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          {notice && <p className="text-sm text-lime bg-lime/10 rounded-2xl px-4 py-3">{notice}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6 md:mt-8 pb-6">
          {mode === 'in' ? 'New to Tipid? ' : mode === 'up' ? 'Already have an account? ' : 'Remembered it? '}
          <button className="text-lime font-semibold" onClick={() => switchMode(mode === 'in' ? 'up' : 'in')}>
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
