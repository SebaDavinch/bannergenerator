import '@fontsource/russo-one/400.css'
import '@fontsource/bebas-neue/400.css'
import '@fontsource/anton/400.css'
import '@fontsource/alfa-slab-one/400.css'
import '@fontsource/pacifico/400.css'
import '@fontsource/lobster/400.css'
import '@fontsource/yellowtail/400.css'
import '@fontsource/marck-script/400.css'
import '@fontsource/caveat/700.css'
import '@fontsource/yeseva-one/400.css'
import '@fontsource/black-ops-one/400.css'
import '@fontsource/bungee/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/oswald/700.css'

export type BadgeFont = {
  family: string
  label: string
  category: 'block' | 'condensed' | 'brush' | 'vintage' | 'tech'
  cyrillic: boolean
  /** Cap-height compensation so different fonts sit visually equal at the same size. */
  sizeFactor: number
}

export const BADGE_FONTS: BadgeFont[] = [
  { family: "'Oswald', sans-serif", label: 'Oswald', category: 'condensed', cyrillic: true, sizeFactor: 1 },
  { family: "'Russo One', sans-serif", label: 'Russo One', category: 'block', cyrillic: true, sizeFactor: 0.94 },
  { family: "'Black Ops One', system-ui", label: 'Black Ops One', category: 'block', cyrillic: false, sizeFactor: 0.9 },
  { family: "'Bungee', system-ui", label: 'Bungee', category: 'block', cyrillic: false, sizeFactor: 0.86 },
  { family: "'Bebas Neue', sans-serif", label: 'Bebas Neue', category: 'condensed', cyrillic: false, sizeFactor: 1.12 },
  { family: "'Anton', sans-serif", label: 'Anton', category: 'condensed', cyrillic: false, sizeFactor: 1.02 },
  { family: "'Alfa Slab One', serif", label: 'Alfa Slab One', category: 'vintage', cyrillic: false, sizeFactor: 0.88 },
  { family: "'Yeseva One', serif", label: 'Yeseva One', category: 'vintage', cyrillic: true, sizeFactor: 0.94 },
  { family: "'Pacifico', cursive", label: 'Pacifico', category: 'brush', cyrillic: false, sizeFactor: 0.82 },
  { family: "'Lobster', cursive", label: 'Lobster', category: 'brush', cyrillic: false, sizeFactor: 0.9 },
  { family: "'Yellowtail', cursive", label: 'Yellowtail', category: 'brush', cyrillic: false, sizeFactor: 0.95 },
  { family: "'Marck Script', cursive", label: 'Marck Script', category: 'brush', cyrillic: true, sizeFactor: 1 },
  { family: "'Caveat', cursive", label: 'Caveat', category: 'brush', cyrillic: true, sizeFactor: 1.15 },
  { family: "'Orbitron', sans-serif", label: 'Orbitron', category: 'tech', cyrillic: false, sizeFactor: 0.9 },
]

export function getBadgeFont(family: string): BadgeFont {
  return BADGE_FONTS.find((font) => font.family === family) ?? BADGE_FONTS[0]
}

export type TextMaterial = 'chrome' | 'gold' | 'enamel' | 'neon' | 'flat'

export const TEXT_MATERIALS: Array<{ id: TextMaterial; labelRu: string; labelEn: string }> = [
  { id: 'chrome', labelRu: 'Хром', labelEn: 'Chrome' },
  { id: 'gold', labelRu: 'Золото', labelEn: 'Gold' },
  { id: 'enamel', labelRu: 'Эмаль', labelEn: 'Enamel' },
  { id: 'neon', labelRu: 'Неон', labelEn: 'Neon' },
  { id: 'flat', labelRu: 'Плоский', labelEn: 'Flat' },
]
