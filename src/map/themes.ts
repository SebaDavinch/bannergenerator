import type { Locale, MapTheme } from '../types'

export type Stop = [number, string]

export interface ReliefPalette {
  /** Elevation (m) → colour for land. */
  land: Stop[]
  /** Depth (m, negative) → colour for water, shallow first. */
  sea: Stop[]
  shadow: string
  highlight: string
  /** 0..1 hillshade contrast. */
  strength: number
}

export interface MapPalette {
  name: Record<Locale, string>
  seaInner: string
  seaOuter: string
  land: string
  landStroke: string
  landShadow: string
  border: string
  graticule: string
  river: string
  lake: string
  node: string
  nodeStroke: string
  chipBg: string
  chipText: string
  chipBorder: string
  cityDot: string
  cityText: string
  firFillOpacity: number
  light: boolean
  relief: ReliefPalette
}

const dark = (p: Partial<MapPalette> & Pick<MapPalette, 'name' | 'relief'>): MapPalette => ({
  seaInner: '#14273c', seaOuter: '#070d16', land: '#1b2b42', landStroke: 'rgba(168,196,232,.30)', landShadow: 'rgba(0,0,0,.55)',
  border: 'rgba(168,196,232,.18)', graticule: 'rgba(255,255,255,.045)', river: 'rgba(120,170,220,.45)', lake: '#10243a',
  node: '#0b1220', nodeStroke: '#ffffff', chipBg: 'rgba(7,11,19,.82)', chipText: '#f4f6fb', chipBorder: 'rgba(255,255,255,.14)',
  cityDot: 'rgba(255,255,255,.7)', cityText: 'rgba(235,242,250,.72)', firFillOpacity: 0.16, light: false,
  ...p,
})

export const MAP_THEMES: Record<Exclude<MapTheme, 'brand'>, MapPalette> = {
  night: dark({
    name: { ru: 'Ночь', en: 'Night' },
    relief: {
      land: [[0, '#1a2a40'], [300, '#1f3149'], [1000, '#2a3d57'], [2500, '#3f5470'], [4500, '#7a8aa0'], [6500, '#c9d2de']],
      sea: [[0, '#13283f'], [-200, '#10223a'], [-2000, '#0a1828'], [-6000, '#050c16']],
      shadow: '#03060c', highlight: '#9fb8d8', strength: 0.85,
    },
  }),
  dusk: dark({
    name: { ru: 'Закат', en: 'Dusk' },
    seaInner: '#241a2e', seaOuter: '#09070d', land: '#2b2232', landStroke: 'rgba(255,196,160,.26)', border: 'rgba(255,196,160,.16)',
    graticule: 'rgba(255,220,200,.04)', river: 'rgba(255,170,140,.38)', lake: '#1d1524', node: '#140e18', nodeStroke: '#fff3ea',
    chipBg: 'rgba(14,9,16,.82)', chipText: '#fff6ef', chipBorder: 'rgba(255,220,200,.16)', cityText: 'rgba(255,236,224,.72)', firFillOpacity: 0.18,
    relief: {
      land: [[0, '#2a2030'], [400, '#352737'], [1200, '#4a3440'], [2800, '#6e4c50'], [4500, '#b08572'], [6500, '#f2d6c0']],
      sea: [[0, '#1f1828'], [-300, '#191322'], [-3000, '#0f0b16'], [-7000, '#07050b']],
      shadow: '#050208', highlight: '#ffc89a', strength: 0.85,
    },
  }),
  terrain: dark({
    name: { ru: 'Рельеф', en: 'Terrain' },
    seaInner: '#173a52', seaOuter: '#0a1c2b', land: '#3c5a3a', landStroke: 'rgba(235,240,220,.35)', border: 'rgba(250,245,230,.32)',
    river: 'rgba(120,190,230,.7)', lake: '#245a7a', chipBg: 'rgba(8,14,18,.84)', cityText: 'rgba(250,250,240,.85)', firFillOpacity: 0.2,
    relief: {
      land: [[-50, '#47704a'], [0, '#4d7a4c'], [150, '#628a52'], [400, '#8a9a5e'], [800, '#a89a66'], [1500, '#9b7d5a'], [2500, '#836a58'], [3500, '#a59c94'], [5000, '#e6e6e6'], [6500, '#ffffff']],
      sea: [[0, '#2f6f93'], [-100, '#285f82'], [-1000, '#1b4867'], [-4000, '#10304a'], [-8000, '#081c2e']],
      shadow: '#1b1a24', highlight: '#fff6dc', strength: 0.9,
    },
  }),
  atlas: dark({
    name: { ru: 'Атлас', en: 'Atlas' },
    seaInner: '#0f2230', seaOuter: '#061019', land: '#26392c', landStroke: 'rgba(220,230,200,.3)', border: 'rgba(230,235,215,.24)',
    river: 'rgba(110,170,200,.55)', lake: '#123047', cityText: 'rgba(240,244,230,.78)', firFillOpacity: 0.2,
    relief: {
      land: [[0, '#203a2b'], [200, '#2b4630'], [600, '#4a5233'], [1200, '#5d5238'], [2500, '#5c4c40'], [4000, '#8c8680'], [6000, '#d8d8d4']],
      sea: [[0, '#14334a'], [-200, '#112c41'], [-2000, '#0b1f30'], [-6000, '#05111c']],
      shadow: '#020406', highlight: '#e8e2c4', strength: 0.95,
    },
  }),
  polar: dark({
    name: { ru: 'Полярная', en: 'Polar' },
    seaInner: '#0d2a3d', seaOuter: '#04121d', land: '#41586b', landStroke: 'rgba(230,245,255,.4)', border: 'rgba(230,245,255,.24)',
    river: 'rgba(170,220,250,.5)', lake: '#173c55', cityText: 'rgba(240,248,255,.8)',
    relief: {
      land: [[0, '#4a6275'], [400, '#5c7587'], [1200, '#7d93a5'], [2500, '#a9bccb'], [4500, '#dde8f0'], [6500, '#ffffff']],
      sea: [[0, '#123a52'], [-300, '#0f3045'], [-3000, '#092233'], [-7000, '#04131e']],
      shadow: '#0a1520', highlight: '#ffffff', strength: 0.8,
    },
  }),
  steel: {
    name: { ru: 'Сталь', en: 'Steel' },
    seaInner: '#e4edf4', seaOuter: '#b3c5d4', land: '#f7f9fc', landStroke: 'rgba(52,84,112,.32)', landShadow: 'rgba(40,70,100,.25)',
    border: 'rgba(52,84,112,.24)', graticule: 'rgba(52,84,112,.08)', river: 'rgba(70,130,180,.5)', lake: '#cddceb', node: '#ffffff', nodeStroke: '#16283a',
    chipBg: 'rgba(255,255,255,.92)', chipText: '#122233', chipBorder: 'rgba(18,34,51,.14)', cityDot: 'rgba(18,34,51,.7)', cityText: 'rgba(18,34,51,.75)',
    firFillOpacity: 0.2, light: true,
    relief: {
      land: [[0, '#f2f5f8'], [500, '#e9eef3'], [1500, '#dbe2ea'], [3000, '#c8d1dc'], [5000, '#f8fafc']],
      sea: [[0, '#d5e2ec'], [-500, '#c6d6e3'], [-4000, '#aebfcf'], [-8000, '#9db0c2']],
      shadow: '#5f7286', highlight: '#ffffff', strength: 0.75,
    },
  },
}

const hex = (h: string) => {
  const v = h.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
const toHex = (c: number[]) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a)
  const y = hex(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

/**
 * Map palette derived from a project's own colours: a monochrome, primary-
 * tinted night map (water darker, land lighter), so any brand colour reads
 * well under white banner text. The secondary colour only tints rivers.
 */
export function brandPalette(colors: { primary: string; secondary: string; dark: string }): MapPalette {
  const base = colors.dark
  const land = (white: number, tint: number) => mix(mix(base, '#ffffff', white), colors.primary, tint)
  const sea = (tint: number, black = 0) => mix(mix(base, colors.primary, tint), '#000000', black)
  return dark({
    name: { ru: 'Цвета проекта', en: 'Project colours' },
    seaInner: sea(0.2), seaOuter: sea(0.08, 0.35), land: land(0.1, 0.1), landStroke: `${mix(colors.primary, '#ffffff', 0.55)}66`,
    border: `${mix(colors.primary, '#ffffff', 0.6)}38`, river: `${mix(colors.secondary, '#ffffff', 0.35)}99`, lake: sea(0.18),
    relief: {
      land: [[0, land(0.1, 0.1)], [500, land(0.13, 0.11)], [1500, land(0.19, 0.12)], [3000, land(0.3, 0.12)], [5000, land(0.55, 0.08)], [6500, land(0.8, 0.04)]],
      sea: [[0, sea(0.22)], [-300, sea(0.17)], [-3000, sea(0.1, 0.15)], [-7000, sea(0.06, 0.45)]],
      shadow: mix(base, '#000000', 0.75), highlight: mix(colors.primary, '#ffffff', 0.65), strength: 0.85,
    },
  })
}

export function paletteFor(theme: MapTheme, project?: { primary: string; secondary: string; dark: string }): MapPalette {
  if (theme === 'brand' && project) return brandPalette(project)
  return MAP_THEMES[theme as Exclude<MapTheme, 'brand'>] ?? MAP_THEMES.night
}

export const THEME_IDS: MapTheme[] = ['night', 'terrain', 'atlas', 'dusk', 'polar', 'steel', 'brand']
