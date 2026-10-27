import type { Brand } from '../types'

export interface BrandTheme {
  id: Brand
  short: string
  name: string
  accent: string
  accentSoft: string
  gradient: string
  route: string
  routeGlow: string
  second: string
  logo: string
  logoHeight: number
  callsign: string
}

export const BRANDS: Record<Brand, BrandTheme> = {
  nws: {
    id: 'nws', short: 'vNWS', name: 'Nordwind Virtual', accent: '#E31E24', accentSoft: '#FF5A60',
    gradient: 'linear-gradient(135deg,#FF3B41 0%,#E31E24 52%,#A9121A 100%)', route: '#FF4E57', routeGlow: 'rgba(255,40,52,.55)',
    second: '#8FB4FF', logo: '/brand/nordwind-logo.png', logoHeight: 74, callsign: 'NWS',
  },
  rag: {
    id: 'rag', short: 'RAG', name: 'Russian Airways Group', accent: '#3C8DFF', accentSoft: '#7FB6FF',
    gradient: 'linear-gradient(135deg,#5CA8FF 0%,#2F6BFF 55%,#2338C9 100%)', route: '#5EE2F2', routeGlow: 'rgba(60,196,220,.5)',
    second: '#BFD845', logo: '/brand/rag-logo.png', logoHeight: 64, callsign: 'RAG',
  },
}

export const TEAM_COLORS = ['#FF4B50', '#3CC4DC', '#BFD845', '#B060DB']
