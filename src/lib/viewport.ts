import { isIOS, isStandalone } from './install'

/**
 * iPhone home-screen apps (status bar "black-translucent" + viewport-fit=cover) report a layout height
 * that is short by the status-bar height, leaving an empty strip at the bottom. We measure the real
 * screen and expose it as --app-h, which the mobile shell and bottom sheets use.
 */
export function measureAppHeight() {
  const portrait = window.matchMedia('(orientation: portrait)').matches
  const physical = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
  const h = isIOS() && isStandalone() ? Math.max(window.innerHeight, physical) : window.innerHeight
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
