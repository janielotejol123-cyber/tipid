import { useEffect, useState } from 'react'

/** Chrome/Android's install event (not in TS's DOM types yet) */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Call once at startup, before React renders, so the event isn't missed. */
export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own button instead of Chrome's mini-bar
    deferred = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const ua = () => navigator.userAgent
export const isIOS = () => /iPad|iPhone|iPod/.test(ua()) || (ua().includes('Mac') && navigator.maxTouchPoints > 1)
export const isAndroid = () => /Android/i.test(ua())
const isMobile = () => isIOS() || isAndroid()

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual' | 'none'

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])

  const mode: InstallMode = isStandalone() ? 'installed'
    : deferred ? 'prompt'
    : isIOS() ? 'ios'
    : isMobile() ? 'manual'
    : 'none'

  async function install() {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null; notify()
    return outcome === 'accepted'
  }

  return { mode, install }
}
