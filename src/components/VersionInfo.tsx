import { useState } from 'react'
import { CHANGELOG } from '../lib/changelog'
import { buildLabel, useNewVersion, versionLabel } from '../lib/version'
import Glyph from './Glyph'
import { Sheet } from './ui'

/** Floating notice when a newer version has been deployed */
export function UpdateNotice() {
  const latest = useNewVersion()
  const [hidden, setHidden] = useState(false)
  if (!latest || hidden) return null
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md card !p-3 flex items-center gap-3 border border-lime/40 shadow-xl shadow-black/40"
      style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
      <span className="size-9 rounded-full bg-lime/10 text-lime flex items-center justify-center"><Glyph name="sparkles" size={18} /></span>
      <p className="flex-1 text-sm"><b>New version {latest !== __APP_VERSION__ ? `v${latest} ` : ''}available</b><br /><span className="text-muted">Reload to get the latest Tipid.</span></p>
      <button className="btn-primary btn-sm" onClick={() => location.reload()}>Reload</button>
      <button className="text-muted text-xs px-1" onClick={() => setHidden(true)}>Later</button>
    </div>
  )
}

/** Settings → About: version + What's new */
export function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mb-6">
      <p className="section-title mb-2">About</p>
      <button className="card w-full flex items-center gap-3 text-left" onClick={() => setOpen(true)}>
        <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">Tipid {versionLabel}</span>
          <span className="block text-xs text-muted truncate">{buildLabel}</span>
        </span>
        <span className="text-sm text-lime font-semibold">What's new</span>
      </button>
      {open && <WhatsNew onClose={() => setOpen(false)} />}
    </section>
  )
}

function WhatsNew({ onClose }: { onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title="What's new">
      <ol className="space-y-5">
        {CHANGELOG.map((r, i) => (
          <li key={r.version}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${i === 0 ? 'bg-lime text-bg' : 'bg-surface-2 text-muted'}`}>v{r.version}</span>
              <span className="font-semibold">{r.title}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted list-disc pl-5">{r.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted mt-6">{buildLabel}</p>
    </Sheet>
  )
}
