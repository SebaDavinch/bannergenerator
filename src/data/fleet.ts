import { useEffect, useState } from 'react'
import type { Project } from './projects'

export interface FleetAircraft {
  /** vAMSYS fleet source key (vnws, rag, …). */
  va: string
  reg: string
  type: string
  model: string
  fleet: string
  kind: string
  pax: number | null
  image: string | null
}

let promise: Promise<FleetAircraft[]> | null = null
let ready: FleetAircraft[] | null = null

export function loadFleet() {
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/fleet.json`)
      .then((r) => r.json())
      .then(async (local: FleetAircraft[]) => {
        // A running backend has the freshest vAMSYS sync; fall back to the bundled snapshot.
        try {
          const res = await fetch(`${apiBase()}/aircraft?limit=500`, { signal: AbortSignal.timeout(2500) })
          if (res.ok) {
            const body = await res.json()
            const items = (body.items ?? body) as Record<string, unknown>[]
            if (Array.isArray(items) && items.length) {
              ready = items
                .filter((a) => !a.is_hidden)
                .map((a) => ({
                  va: a.source as FleetAircraft['va'], reg: String(a.registration), type: String(a.fleet_code ?? ''),
                  model: String(a.name ?? ''), fleet: String(a.fleet_name ?? ''), kind: String(a.fleet_type ?? ''),
                  pax: (a.passengers as number) ?? null, image: (a.image_url as string) ?? null,
                }))
              return ready
            }
          }
        } catch { /* backend offline */ }
        ready = local
        return local
      })
  }
  return promise
}

export function useFleet() {
  const [fleet, setFleet] = useState<FleetAircraft[] | null>(ready)
  useEffect(() => {
    if (!fleet) loadFleet().then(setFleet).catch(() => setFleet([]))
  }, [fleet])
  return fleet
}

export function searchFleet(fleet: FleetAircraft[], query: string, project: Project, limit = 10) {
  const q = query.trim().toUpperCase().replace(/\s+/g, '')
  const src = project.fleet
  const own = fleet.filter((a) => a.va === src)
  if (!q) return own.slice(0, limit)
  const norm = (s: string) => s.toUpperCase().replace(/[\s-]/g, '')
  const qn = norm(q)
  return own
    .map((a) => {
      const reg = norm(a.reg)
      let s = -1
      if (reg === qn) s = 100
      else if (reg.startsWith(qn) || reg.slice(2).startsWith(qn)) s = 80
      else if (reg.includes(qn)) s = 60
      else if (norm(a.type) === qn) s = 50
      else if (norm(`${a.model} ${a.fleet}`).includes(qn)) s = 30
      return { a, s }
    })
    .filter((x) => x.s >= 0)
    .sort((x, y) => y.s - x.s || x.a.reg.localeCompare(y.a.reg))
    .slice(0, limit)
    .map((x) => x.a)
}

/** One entry per fleet type for the "pick a type" chips. */
export function fleetTypes(fleet: FleetAircraft[], project: Project) {
  const src = project.fleet
  const map = new Map<string, { type: string; model: string; count: number }>()
  for (const a of fleet) {
    if (a.va !== src) continue
    const cur = map.get(a.type)
    if (cur) cur.count++
    else map.set(a.type, { type: a.type, model: a.fleet || a.model, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api'
}
