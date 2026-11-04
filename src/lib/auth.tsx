import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  /** true after opening a password reset link, until a new password is saved */
  recovering: boolean
  finishRecovery: () => void
}
const AuthCtx = createContext<AuthState>({ session: null, loading: true, recovering: false, finishRecovery: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ session: null as Session | null, loading: true })
  // Read the link too: the sign-in event can fire before this component starts listening
  const [recovering, setRecovering] = useState(() => location.hash.includes('type=recovery'))
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setState({ session, loading: false })
    })
    return () => data.subscription.unsubscribe()
  }, [])
  const finishRecovery = useCallback(() => setRecovering(false), [])
  const value = useMemo(() => ({ ...state, recovering, finishRecovery }), [state, recovering, finishRecovery])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
