import { toCanvas } from 'html-to-image'
import type { StudioState } from '../types'

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export function bannerTitle(state: StudioState): string {
  const d = state.data
  switch (state.mode) {
    case 'focus-airport': return d['focus-airport'].cityOverride || d['focus-airport'].airport?.city || 'focus'
    default: return (d[state.mode] as { title?: string }).title || state.mode
  }
}

export function defaultName(state: StudioState) {
  const date = new Date().toISOString().slice(0, 10)
  const extra = state.mode === 'focus-airport' ? state.data['focus-airport'].airport?.icao ?? '' : ''
  return [state.brand, state.mode, slug(bannerTitle(state)), extra.toLowerCase(), date].filter(Boolean).join('-')
}

/** Waits for fonts and every <img> inside the stage so nothing renders half-loaded. */
async function settle(node: HTMLElement) {
  await document.fonts.ready
  await Promise.all([...node.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r }))))
}

export async function renderBanner(node: HTMLElement, width: number) {
  await settle(node)
  return toCanvas(node, {
    width: 1920, height: 1080, canvasWidth: width, canvasHeight: Math.round((width * 9) / 16), pixelRatio: 1,
    style: { transform: 'none' }, cacheBust: false,
  })
}
