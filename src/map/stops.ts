import { useMemo } from 'react'
import { greatCircleNm, useAirportDb, type AirportRecord } from '../data/airports'
import type { Leg } from '../types'
import type { MapRoute, MapStop } from './RouteMap'

export const toStop = (a: AirportRecord, role?: MapStop['role']): MapStop => ({ icao: a.icao, lon: a.lon, lat: a.lat, country: a.country, city: a.city, role })

/** Legs → map route + summary stats; unknown ICAOs are skipped. */
export function useLegRoute(legs: Leg[], id: string, color: string, glow: string) {
  const db = useAirportDb()
  return useMemo(() => {
    const pairs: [MapStop, MapStop][] = []
    let nm = 0
    const airports = new Set<string>()
    for (const l of legs) {
      const a = db?.byIcao.get(l.from)
      const b = db?.byIcao.get(l.to)
      if (l.from) airports.add(l.from)
      if (l.to) airports.add(l.to)
      if (a && b) {
        pairs.push([toStop(a), toStop(b)])
        nm += greatCircleNm(a, b)
      }
    }
    if (pairs[0]) pairs[0][0] = { ...pairs[0][0], role: 'start' }
    const route: MapRoute = { id, stops: [], pairs, color, glow }
    return { route, nm: Math.round(nm), airports: airports.size, legs: legs.filter((l) => l.from && l.to).length, db }
  }, [db, legs, id, color, glow])
}

export function useAirports(icaos: string[]) {
  const db = useAirportDb()
  return useMemo(() => icaos.map((i) => db?.byIcao.get(i)).filter((a): a is AirportRecord => !!a), [db, icaos])
}

export const fmtNum = (n: number | string) => {
  const v = typeof n === 'number' ? n : Number(String(n).replace(/\s/g, ''))
  return Number.isFinite(v) && String(n).trim() !== '' ? v.toLocaleString('ru-RU').replace(/,/g, ' ') : String(n)
}
