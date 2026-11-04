import { useState } from 'react'
import { Link } from 'react-router'
import ChangePassword from '../components/ChangePassword'
import { InstallRow } from '../components/InstallApp'
import { AboutSection } from '../components/VersionInfo'
import { IconChevron, IconLogout, IconSliders } from '../components/icons'
import { PageHeader } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

/** App and account settings. Money settings live on the Budget setup page. */
export default function Settings() {
  const { session } = useAuth()
  const email = session?.user.email
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" back />

      <Link to="/budget" className="card flex items-center justify-between gap-3 mb-6">
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-semibold"><IconSliders size={18} className="text-lime" />Budget setup</span>
          <span className="block text-sm text-muted">Income, bills and spending budgets</span>
        </span>
        <IconChevron className="text-muted shrink-0" />
      </Link>

      <section className="mb-6">
        <p className="section-title mb-2">Account</p>
        <div className="card space-y-3">
          <p className="text-sm text-muted break-all">Signed in as {email}</p>
          <button className="text-sm text-lime font-semibold" onClick={() => setChangingPassword(true)}>Change password</button>
        </div>
      </section>

      <section className="mb-6"><p className="section-title mb-2">App</p><InstallRow /></section>
      <AboutSection />

      <button onClick={() => supabase.auth.signOut()} className="btn-ghost w-full md:hidden"><IconLogout size={18} />Sign out</button>

      {changingPassword && email && <ChangePassword email={email} onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
