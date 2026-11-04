import { useEffect, useState } from 'react'

export const APP_VERSION = __APP_VERSION__
export const APP_COMMIT = __APP_COMMIT__
export const BUILD_DATE = __BUILD_DATE__
export const versionLabel = `v${APP_VERSION}`
export const buildLabel = `${versionLabel} · build ${APP_COMMIT} · ${new Date(BUILD_DATE).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`

/**
 * Checks /version.json (written at build time) when the app opens or comes back to the foreground,
 * and every 30 minutes. Returns the newer version string when one has been deployed.
 */
export function useNewVersion() {
  const [latest, setLatest] = useState<string | null>(null)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    let stop = false
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) return
        const v = (await r.json()) as { version: string; commit: string }
        if (!stop && (v.commit !== APP_COMMIT || v.version !== APP_VERSION)) setLatest(v.version)
      } catch { /* offline — try later */ }
    }
    check()
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    const t = window.setInterval(check, 30 * 60 * 1000)
    return () => { stop = true; document.removeEventListener('visibilitychange', onVis); clearInterval(t) }
  }, [])
  return latest
}
