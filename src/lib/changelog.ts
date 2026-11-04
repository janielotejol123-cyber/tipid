/** Newest first. Keep in sync with CHANGELOG.md and the "version" in package.json. */
export const CHANGELOG: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '1.8.0', date: '2026-11-05', title: 'Family and Business money',
    items: [
      'Mark any income or category as Family or Business in Budget setup.',
      'Reports can show All, Family or Business money.',
      'New Transfer entry for business money used at home. It is not counted twice.',
    ],
  },
  {
    version: '1.7.1', date: '2026-11-05', title: 'Phone layout fix',
    items: [
      'Home no longer slides sideways on phones when an entry has a long note.',
      'Reports: the monthly summary line is smaller so the amounts stand out, and the status label stays on one line.',
    ],
  },
  {
    version: '1.7.0', date: '2026-11-05', title: 'Password tools and a clearer Settings',
    items: [
      'Tap the eye on the login screen to show or hide your password.',
      'Change your password in Settings. This signs you out on your other devices.',
      'Forgot password? Ask for a reset link from the login screen.',
      'Settings is now split in two: Budget setup for income, bills and budgets, and Settings for your account and the app.',
    ],
  },
  {
    version: '1.6.0', date: '2026-11-04', title: 'Weekly, monthly and yearly reports',
    items: [
      'Reports now has Weekly, Monthly and Yearly tabs.',
      'Yearly shows your total income, spending and savings, with a month by month chart.',
      'Tap an income source or spending category to see every entry behind it.',
      'New Income received section shows the money that came in and who received it.',
    ],
  },
  {
    version: '1.5.0', date: '2026-11-04', title: 'Add new names on the spot',
    items: [
      'When adding an expense or income, tap "+ New" to create a category, income source or person right there.',
      'New categories get a matching icon automatically (e.g. "Milk tea" → food).',
    ],
  },
  {
    version: '1.4.3', date: '2026-11-04', title: 'iPhone bottom menu fix',
    items: ['Solid black top bar on iPhone so the bottom menu sits on the bottom edge (re-add Tipid to your home screen once).'],
  },
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
