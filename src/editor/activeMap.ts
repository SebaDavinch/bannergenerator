import type { MapView, ModeId, StudioState } from '../types'

export function activeMap(state: StudioState): { mode: ModeId; view: MapView } | null {
  const m = state.mode
  const d = state.data
  if (m === 'tour' || m === 'event' || m === 'vatsim-region') return { mode: m, view: d[m].map }
  if ((m === 'roster' || m === 'curated-roster' || m === 'slotted') && d[m].visual === 'map') return { mode: m, view: d[m].map }
  return null
}
