import { mix } from '../map/themes'
import type { Project } from '../data/projects'

/** Banner-facing colours and identity derived from a vAMSYS project. */
export interface BrandTheme {
  project: Project
  id: string
  short: string
  name: string
  accent: string
  accentSoft: string
  gradient: string
  route: string
  routeGlow: string
  second: string
  callsign: string
}

const alpha = (hex: string, a: number) => {
  const v = hex.replace('#', '')
  return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`
}

export function brandTheme(p: Project): BrandTheme {
  const c = p.colors
  return {
    project: p,
    id: p.id,
    short: p.short,
    name: p.name,
    accent: c.primary,
    accentSoft: mix(c.primary, '#ffffff', 0.28),
    gradient: `linear-gradient(135deg, ${mix(c.primary, '#ffffff', 0.18)} 0%, ${c.primary} 52%, ${mix(c.primary, '#000000', 0.28)} 100%)`,
    route: c.route,
    routeGlow: alpha(c.route, 0.55),
    second: c.secondary,
    callsign: p.callsign || p.icao,
  }
}

export const TEAM_COLORS = ['#FF4B50', '#3CC4DC', '#BFD845', '#B060DB']
