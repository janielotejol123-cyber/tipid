import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useData } from '../lib/household'
import { supabase } from '../lib/supabase'
import { IconChart, IconHome, IconLogout, IconPlus, IconReceipt, IconSettings, IconTarget, IconUsers } from './icons'
import { Logo } from './ui'
import { versionLabel } from '../lib/version'

type NavItem = { to: string; label: string; icon: (p: { size?: number }) => React.ReactElement; end?: boolean }
const tabs: NavItem[] = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/goals', label: 'Goals', icon: IconTarget },
  { to: '/family', label: 'Family', icon: IconUsers },
  { to: '/reports', label: 'Reports', icon: IconChart },
]
const desktopExtra: NavItem[] = [
  { to: '/bills', label: 'Bills', icon: IconReceipt },
  { to: '/settings', label: 'Budget settings', icon: IconSettings },
]

export default function AppShell() {
  const nav = useNavigate()
  const { data } = useData()
  const { pathname } = useLocation()
  const scroller = useRef<HTMLElement>(null)
  // Content scrolls inside <main> on mobile, so reset it when switching tabs
  useEffect(() => { scroller.current?.scrollTo(0, 0); window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="h-full flex flex-col md:h-auto md:min-h-full md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-line p-5 sticky top-0 h-screen">
        <Logo className="px-3 mb-1" />
        <p className="px-3 text-xs text-muted mb-8 truncate">{data.household.name}</p>
        <button onClick={() => nav('/add')} className="btn-primary mb-6"><IconPlus size={20} /> Add</button>
        <nav className="flex flex-col gap-1">
          {[...tabs, ...desktopExtra].map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 h-11 font-medium transition ${isActive ? 'bg-surface text-lime' : 'text-muted hover:text-ink hover:bg-surface/60'}`}>
              <t.icon size={20} />{t.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="mt-auto flex items-center gap-3 px-3 h-11 text-muted hover:text-ink">
          <IconLogout size={20} /> Sign out
        </button>
        <Link to="/settings" className="px-3 text-xs text-muted/60 hover:text-muted">Tipid {versionLabel}</Link>
      </aside>

      <main ref={scroller} className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain md:overflow-visible">
        <div className="mx-auto max-w-5xl px-4 md:px-8 pt-5 md:pt-8 pb-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar with center + button */}
      <nav className="md:hidden shrink-0 relative z-40 bg-bg border-t border-line pb-safe">
        <div className="grid grid-cols-5 items-end h-16 px-2">
          {tabs.slice(0, 2).map((t) => <Tab key={t.to} {...t} />)}
          <div className="flex justify-center">
            <button onClick={() => nav('/add')} aria-label="Add"
              className="-mt-6 size-14 rounded-full bg-lime text-bg flex items-center justify-center shadow-lg shadow-lime/20 active:scale-95 transition">
              <IconPlus size={28} />
            </button>
          </div>
          {tabs.slice(2).map((t) => <Tab key={t.to} {...t} />)}
        </div>
      </nav>
    </div>
  )
}

function Tab({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `flex flex-col items-center justify-center gap-1 h-full text-[11px] font-medium ${isActive ? 'text-lime' : 'text-muted'}`}>
      <Icon size={22} />{label}
    </NavLink>
  )
}
