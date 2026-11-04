/** Newest first. Keep in sync with CHANGELOG.md and the "version" in package.json. */
export const CHANGELOG: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '1.4.2', date: '2026-11-04', title: 'iPhone bottom menu',
    items: ['Fixed the empty space under the bottom menu in the iPhone home-screen app.'],
  },
  {
    version: '1.4.1', date: '2026-11-04', title: 'Updates & iPhone fix',
    items: [
      'Settings → About → "Check for updates" always loads the newest version.',
      'Fixed an empty strip under the bottom menu on iPhone home-screen app.',
    ],
  },
  {
    version: '1.4.0', date: '2026-11-04', title: 'Flexible income',
    items: [
      'Income can be Fixed (salary) or Varies (business, projects).',
      'Record business or project money as it comes in — Tipid learns your usual month from the last 3 months.',
      'App version, "What\'s new" and a notice when a new version is available.',
    ],
  },
  {
    version: '1.3.0', date: '2026-11-04', title: 'Smarter bills',
    items: [
      'Bills that change (electricity, water) are estimated from what you actually paid.',
      'Track late fees and penalties separately when paying a bill.',
    ],
  },
  {
    version: '1.2.0', date: '2026-11-04', title: 'New look',
    items: ['Minimalist line icons replace emojis.', 'New line-style app icon.'],
  },
  {
    version: '1.1.0', date: '2026-11-04', title: 'Install on your phone',
    items: [
      'Add Tipid to your home screen (Android install button, iPhone steps).',
      'Bottom menu always stays in place; no overlap with the iPhone status bar; no accidental zoom.',
      'Clearer sign-up error messages; sign-up setup fixed.',
    ],
  },
  {
    version: '1.0.0', date: '2026-11-04', title: 'First release',
    items: ['Sign-up questions, Home, Add, Bills, Savings goals with suggestions, Family, Reports.'],
  },
]
