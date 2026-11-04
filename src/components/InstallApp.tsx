import { useState } from 'react'
import { useInstall } from '../lib/install'
import { IconClose } from './icons'
import { Sheet } from './ui'

const DISMISS_KEY = 'tipid-install-dismissed'

/** Home-screen banner. Hidden once installed or dismissed. */
export function InstallBanner() {
  const { mode, install } = useInstall()
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [help, setHelp] = useState(false)
  if (hidden || mode === 'installed' || mode === 'none') return null

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setHidden(true) }
  return (
    <>
      <section className="card !p-4 flex items-center gap-3 border border-lime/30">
        <img src="/icons/icon-192.png" alt="" className="size-12 rounded-2xl" />
        <div className="flex-1 min-w-0">
          <p className="font-bold">Install Tipid</p>
          <p className="text-sm text-muted">Open it from your home screen like a real app.</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => (mode === 'prompt' ? install() : setHelp(true))}>Install</button>
        <button className="text-muted p-1" aria-label="Dismiss" onClick={dismiss}><IconClose size={18} /></button>
      </section>
      {help && <InstallHelp onClose={() => setHelp(false)} />}
    </>
  )
}

/** Row for Settings — always available until installed. */
export function InstallRow() {
  const { mode, install } = useInstall()
  const [help, setHelp] = useState(false)
  if (mode === 'installed') return <p className="text-sm text-lime">✅ Tipid is installed on this device.</p>
  return (
    <>
      <button className="btn-ghost w-full" onClick={() => (mode === 'prompt' ? install() : setHelp(true))}>📲 Install Tipid on this device</button>
      {help && <InstallHelp onClose={() => setHelp(false)} />}
    </>
  )
}

function InstallHelp({ onClose }: { onClose: () => void }) {
  const { mode } = useInstall()
  const steps = mode === 'ios'
    ? [
        <>Open Tipid in <b className="text-ink">Safari</b> (other browsers on iPhone can't install apps).</>,
        <>Tap the <b className="text-ink">Share</b> button <span className="inline-block px-1.5 rounded bg-surface-2">⬆︎</span> at the bottom of the screen.</>,
        <>Scroll down and tap <b className="text-ink">Add to Home Screen</b>.</>,
        <>Tap <b className="text-ink">Add</b>. Tipid now opens from your home screen.</>,
      ]
    : mode === 'manual'
      ? [
          <>Open Tipid in <b className="text-ink">Chrome</b>.</>,
          <>Tap the <b className="text-ink">⋮ menu</b> at the top right.</>,
          <>Tap <b className="text-ink">Add to Home screen</b> or <b className="text-ink">Install app</b>.</>,
          <>Tap <b className="text-ink">Install</b>.</>,
        ]
      : [<>On a computer, click the <b className="text-ink">install icon</b> in the address bar (Chrome or Edge).</>]
  return (
    <Sheet open onClose={onClose} title="Add Tipid to your home screen">
      <ol className="space-y-3 text-sm text-muted">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3"><span className="size-6 shrink-0 rounded-full bg-lime text-bg font-bold flex items-center justify-center text-xs">{i + 1}</span><span>{s}</span></li>
        ))}
      </ol>
      <button className="btn-primary w-full mt-6" onClick={onClose}>Got it</button>
    </Sheet>
  )
}
