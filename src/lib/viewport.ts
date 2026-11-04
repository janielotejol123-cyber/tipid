import { isStandalone } from './install'

/**
 * Visible app height as --app-h (used by the mobile shell and bottom sheets).
 * The iPhone status bar is solid black (index.html), so iOS starts the app below it and
 * gives the full height to the bottom edge — no translucent-status-bar height bug.
 */
export function measureAppHeight() {
  const portrait = window.matchMedia('(orientation: portrait)').matches
  const physical = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
  // Use the visible height iOS gives us (stretching to the physical screen got clipped on iPhone 16 Pro)
  const h = window.innerHeight
  document.documentElement.style.setProperty('--app-h', `${h}px`)
  return { inner: window.innerHeight, screen: physical, used: h }
}

export function initViewport() {
  measureAppHeight()
  for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, () => measureAppHeight())
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') measureAppHeight() })
  // iOS sometimes settles the viewport a moment after launch
  setTimeout(measureAppHeight, 300)
}

/** Shown in Settings → About to help diagnose display issues */
export function displayInfo() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const top = parseInt(cs.paddingTop), bottom = parseInt(cs.paddingBottom)
  probe.remove()
  const m = measureAppHeight()
  return `${isStandalone() ? 'app' : 'browser'} · view ${window.innerWidth}×${m.inner} · screen ${m.screen} · using ${m.used} · safe ${top}/${bottom}`
}
