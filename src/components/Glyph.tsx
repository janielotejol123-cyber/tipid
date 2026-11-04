import type { ReactNode } from 'react'

/**
 * Minimalist line icons used for categories, goals and UI accents (replaces emojis).
 * Categories/goals store a key (e.g. "home"). Older rows that stored an emoji are mapped below.
 */
const P: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></>,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  wifi: <><path d="M2 8.5a15 15 0 0 1 20 0" /><path d="M5 12a10 10 0 0 1 14 0" /><path d="M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r=".6" fill="currentColor" /></>,
  cart: <><path d="M3 4h2l2.4 11h10.2L20 8H6.2" /><circle cx="9" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></>,
  utensils: <><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10" /><path d="M17 21V3c-2 1.5-3 4-3 7h3" /></>,
  bus: <><rect x="5" y="3" width="14" height="15" rx="2.5" /><path d="M5 11h14M8 18v2.5M16 18v2.5" /><circle cx="8.5" cy="14.5" r=".6" fill="currentColor" /><circle cx="15.5" cy="14.5" r=".6" fill="currentColor" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  bag: <><path d="M5 8h14l-1 13H6z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  backpack: <><path d="M6 10a6 6 0 0 1 12 0v11H6z" /><path d="M9 4.5V3h6v1.5M9 14h6v3H9z" /></>,
  medical: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></>,
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2z" />,
  pill: <><rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="m8.5 8.5 7 7" /></>,
  paw: <><circle cx="7" cy="9" r="1.6" /><circle cx="11" cy="6" r="1.6" /><circle cx="15.5" cy="7" r="1.6" /><circle cx="18" cy="11" r="1.6" /><path d="M8 17c0-3 2-5.5 4.5-5.5S17 14 17 17c0 2-1.8 3-4.5 3S8 19 8 17z" /></>,
  gamepad: <><path d="M7 7h10a5 5 0 0 1 5 5v1.5a3.5 3.5 0 0 1-6.3 2.1L15 15H9l-.7.6A3.5 3.5 0 0 1 2 13.5V12a5 5 0 0 1 5-5z" /><path d="M7 10.5v3M5.5 12h3" /><circle cx="16.5" cy="11" r=".6" fill="currentColor" /><circle cx="18" cy="13" r=".6" fill="currentColor" /></>,
  fuel: <><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10" /><path d="M14 8h2a2 2 0 0 1 2 2v6.5a1.5 1.5 0 0 0 3 0V8l-3-3" /></>,
  baby: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8C10 4 6.5 4.5 7 7c.3 1 5 1 5 1zm0 0c2-4 5.5-3.5 5-1-.3 1-5 1-5 1z" /></>,
  tv: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m8.5 2.5 3.5 3.5 3.5-3.5M8 21h8" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></>,
  wallet: <><path d="M4 7.5V18a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h11v4" /><circle cx="16" cy="14.5" r=".8" fill="currentColor" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3" /></>,
  piggy: <><path d="M19 9.5c1.3 0 2 .8 2 2M5 12a7 6 0 0 1 7-6h1a7 6 0 0 1 6 3.5v2.5l2 1v3h-2l-1 3h-3v-2h-4v2H8l-1-3a6 6 0 0 1-2-4z" /><circle cx="15" cy="10" r=".6" fill="currentColor" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  laptop: <><rect x="4" y="4.5" width="16" height="11" rx="1.5" /><path d="M2 19.5h20" /></>,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  graduation: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" /></>,
  car: <><path d="M5 17H3.5v-5l2-5.5A2 2 0 0 1 7.4 5h9.2a2 2 0 0 1 1.9 1.5l2 5.5v5H19" /><path d="M3.5 12h17M9 17h6" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>,
  bike: <><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M5.5 16.5 9 9h5l4.5 7.5M12 16.5 9 9M14 9l1-3h2.5" /></>,
  gem: <><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18M12 21 8.5 9 12 3l3.5 6z" /></>,
  tree: <><path d="M12 2.5 6.5 10H9l-4 6h14l-4-6h2.5z" /><path d="M12 16v5" /></>,
  lifebuoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3" /></>,
  sofa: <><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3zM5 18v2M19 18v2" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  couple: <><circle cx="8.5" cy="8" r="3.2" /><circle cx="16" cy="8.5" r="2.8" /><path d="M2.5 20a6 6 0 0 1 12 0M14.5 14.2A5 5 0 0 1 21.5 19" /></>,
  family: <><circle cx="7" cy="7" r="2.8" /><circle cx="17" cy="7" r="2.8" /><circle cx="12" cy="13" r="2.2" /><path d="M2 19a5 5 0 0 1 8-4M22 19a5 5 0 0 0-8-4M8.5 21a3.5 3.5 0 0 1 7 0" /></>,
  stop: <><path d="M8 2.5h8L21.5 8v8L16 21.5H8L2.5 16V8z" /><path d="M8.5 12h7" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16 10" /></>,
  sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  share: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>,
  download: <><path d="M12 3v12M8 11l4 4 4-4" /><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></>,
}

/** Old emoji values already saved in the database → icon key */
const FROM_EMOJI: Record<string, string> = {
  '🏠': 'home', '💧': 'droplet', '⚡': 'zap', '📶': 'wifi', '🛒': 'cart', '🍔': 'utensils', '🚌': 'bus',
  '📱': 'phone', '🛍️': 'bag', '🛍': 'bag', '🎒': 'backpack', '🏥': 'medical', '🔧': 'wrench', '💊': 'pill', '🐶': 'paw',
  '🎮': 'gamepad', '⛽': 'fuel', '👶': 'baby', '🎁': 'gift', '📺': 'tv', '💳': 'card', '💸': 'wallet', '💰': 'coins',
  '🐷': 'piggy', '🎯': 'target', '💻': 'laptop', '✈️': 'plane', '✈': 'plane', '🏖️': 'sun', '🏖': 'sun', '🎓': 'graduation',
  '🚗': 'car', '🏍️': 'bike', '🏍': 'bike', '💍': 'gem', '🎄': 'tree', '🛟': 'lifebuoy', '🩺': 'medical', '🛋️': 'sofa', '🛋': 'sofa',
  '🧾': 'receipt',
}

export const glyphKey = (v: string | null | undefined, fallback = 'wallet') =>
  v && P[v] ? v : (v && FROM_EMOJI[v]) || fallback

export const CATEGORY_ICONS = ['home', 'droplet', 'zap', 'wifi', 'cart', 'utensils', 'bus', 'phone', 'bag', 'backpack', 'medical',
  'wrench', 'pill', 'paw', 'gamepad', 'fuel', 'baby', 'gift', 'tv', 'card', 'wallet']
export const GOAL_ICONS = ['target', 'phone', 'laptop', 'plane', 'sun', 'graduation', 'car', 'bike', 'home', 'gem', 'tree',
  'lifebuoy', 'baby', 'medical', 'gamepad', 'sofa']

export default function Glyph({ name, size = 20, className = '', fallback }: { name: string | null | undefined; size?: number; className?: string; fallback?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {P[glyphKey(name, fallback)]}
    </svg>
  )
}

/** Round icon badge used in lists (bills, transactions, goals) */
export function GlyphBadge({ name, size = 44, tone = 'bg-surface-2 text-lime', fallback }: { name: string | null | undefined; size?: number; tone?: string; fallback?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full shrink-0 ${tone}`} style={{ width: size, height: size }}>
      <Glyph name={name} size={Math.round(size * 0.46)} fallback={fallback} />
    </span>
  )
}
