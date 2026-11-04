import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

// ── App version info (shown in Settings, used for "new version available") ──
const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const git = (cmd: string) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } }
// Cloudflare Pages provides the commit; locally we ask git
const commit = (process.env.CF_PAGES_COMMIT_SHA || git('git rev-parse HEAD') || 'dev').slice(0, 7)
const buildDate = new Date().toISOString()

/** Writes /version.json so open apps can detect that a newer version was deployed */
const versionFile = (): Plugin => ({
  name: 'tipid-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, commit, buildDate }) + '\n' })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  server: { port: 5180, strictPort: true },
})
