import { useState, type FormEvent } from 'react'
import PasswordField from '../components/PasswordField'
import { ErrorText, Logo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const MIN_LENGTH = 8

/** Shown after someone opens the reset link from their email. */
export default function ResetPassword() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setShown(false)
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      console.error('Password reset failed', error.message)
      setBusy(false)
      return setError(error.code === 'same_password' ? 'Choose a password different from your old one.' : 'Something went wrong. Please ask for a new reset link.')
    }
    // Someone forgetting a password may also have lost a device, so remove every other sign-in
    await supabase.auth.signOut({ scope: 'others' })
    finishRecovery()
  }

  return (
    <div className="min-h-full flex flex-col md:items-center md:justify-center p-6">
      <div className="w-full md:max-w-sm mx-auto">
        <div className="pt-10 md:pt-0 mb-10">
          <Logo className="text-4xl" />
          <h1 className="text-3xl font-bold mt-8 leading-tight">Set a new password</h1>
          <p className="text-muted mt-2">At least {MIN_LENGTH} characters. Other devices will be signed out.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <PasswordField required placeholder="New password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} shown={shown} onShownChange={setShown} />
          <ErrorText>{error}</ErrorText>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      </div>
    </div>
  )
}
