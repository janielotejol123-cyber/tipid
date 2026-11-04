import { useState, type FormEvent } from 'react'
import PasswordField from './PasswordField'
import { ErrorText, Sheet } from './ui'
import { supabase } from '../lib/supabase'

const MIN_LENGTH = 8

export default function ChangePassword({ email, onClose }: { email: string; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setShowCurrent(false); setShowNext(false)
    if (next.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (next === current) return setError('Choose a password different from your current one.')
    setBusy(true)
    // An open app is not proof of who is holding the phone, so ask for the current password first
    const check = await supabase.auth.signInWithPassword({ email, password: current })
    if (check.error) {
      setBusy(false)
      return setError(check.error.status === 429 ? 'Too many tries. Wait a few minutes and try again.' : 'Your current password is not right.')
    }
    const update = await supabase.auth.updateUser({ password: next })
    if (update.error) {
      console.error('Password change failed', update.error.message)
      setBusy(false)
      return setError('Something went wrong. Your password was not changed.')
    }
    // Anyone signed in elsewhere with the old password is removed; this device stays signed in
    await supabase.auth.signOut({ scope: 'others' })
    setBusy(false); setCurrent(''); setNext(''); setDone(true)
  }

  return (
    <Sheet open onClose={onClose} title="Change password">
      {done ? (
        <div className="space-y-4">
          <p>Your password has been changed. Any other devices have been signed out.</p>
          <button className="btn-primary w-full" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <div><label className="label" htmlFor="current-password">Current password</label>
            <PasswordField id="current-password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} shown={showCurrent} onShownChange={setShowCurrent} /></div>
          <div><label className="label" htmlFor="new-password">New password</label>
            <PasswordField id="new-password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} shown={showNext} onShownChange={setShowNext} />
            <p className="text-xs text-muted mt-1.5">At least {MIN_LENGTH} characters. Other devices will be signed out.</p></div>
          <ErrorText>{error}</ErrorText>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
      )}
    </Sheet>
  )
}
