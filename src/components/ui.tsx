import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { statusCopy, type Status } from '../lib/budget'
import { IconBack } from './icons'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight text-2xl leading-none ${className}`}>
      tipid<span className="text-lime">.</span>
    </span>
  )
}

export function StatusPill({ status }: { status: Status }) {
  const s = statusCopy[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${s.tone}`}>
      <span className="size-1.5 rounded-full bg-current" />{s.label}
    </span>
  )
}

export function Progress({ value, tone = 'bg-lime', className = '' }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-surface-2 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function Avatar({ name, size = 40, tone = 'bg-surface-2' }: { name: string; size?: number; tone?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <span className={`${tone} inline-flex items-center justify-center rounded-full font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>
  )
}

export function PageHeader({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="flex items-center gap-3 mb-5">
      {back && (
        <button onClick={() => nav(-1)} className="size-10 rounded-full bg-surface flex items-center justify-center" aria-label="Back">
          <IconBack />
        </button>
      )}
      <h1 className="text-2xl font-bold flex-1">{title}</h1>
      {right}
    </header>
  )
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted mt-1">{children}</div>}
    </div>
  )
}

/** Bottom sheet on mobile, centered dialog on desktop */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full md:max-w-md bg-surface rounded-t-3xl md:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="md:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="size-8 rounded-full border-2 border-line border-t-lime animate-spin" />
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">{children}</p>
}
