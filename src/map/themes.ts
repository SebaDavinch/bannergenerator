import type { MapTheme } from '../types'

export interface MapPalette {
  seaInner: string
  seaOuter: string
  land: string
  landStroke: string
  landShadow: string
  border: string
  graticule: string
  node: string
  nodeStroke: string
  chipBg: string
  chipText: string
  chipBorder: string
  firFillOpacity: number
  light: boolean
}

export const MAP_THEMES: Record<MapTheme, MapPalette> = {
  night: {
    seaInner: '#14273c', seaOuter: '#070d16', land: '#1b2b42', landStroke: 'rgba(168,196,232,.30)', landShadow: 'rgba(0,0,0,.55)',
    border: 'rgba(168,196,232,.16)', graticule: 'rgba(255,255,255,.045)', node: '#0b1220', nodeStroke: '#ffffff',
    chipBg: 'rgba(7,11,19,.82)', chipText: '#f4f6fb', chipBorder: 'rgba(255,255,255,.14)', firFillOpacity: 0.16, light: false,
  },
  dusk: {
    seaInner: '#241a2e', seaOuter: '#09070d', land: '#2b2232', landStroke: 'rgba(255,196,160,.26)', landShadow: 'rgba(0,0,0,.6)',
    border: 'rgba(255,196,160,.14)', graticule: 'rgba(255,220,200,.04)', node: '#140e18', nodeStroke: '#fff3ea',
    chipBg: 'rgba(14,9,16,.82)', chipText: '#fff6ef', chipBorder: 'rgba(255,220,200,.16)', firFillOpacity: 0.18, light: false,
  },
  steel: {
    seaInner: '#e4edf4', seaOuter: '#b3c5d4', land: '#f7f9fc', landStroke: 'rgba(52,84,112,.32)', landShadow: 'rgba(40,70,100,.25)',
    border: 'rgba(52,84,112,.22)', graticule: 'rgba(52,84,112,.08)', node: '#ffffff', nodeStroke: '#16283a',
    chipBg: 'rgba(255,255,255,.92)', chipText: '#122233', chipBorder: 'rgba(18,34,51,.14)', firFillOpacity: 0.2, light: true,
  },
}
