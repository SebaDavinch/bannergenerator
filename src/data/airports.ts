import { useEffect, useState } from 'react'
import type { AirportRef } from '../types'

export interface AirportRecord extends AirportRef {
  fullName: string
  /** L / M / S */
  size: 'L' | 'M' | 'S'
  scheduled: boolean
  /** bit 1 = vNWS network, 2 = RAG network, 4 = hub */
  network: number
  ru: string
  /** Lower-cased haystack for search. */
  hay: string
  cityKey: string
  /** Russian city name (empty when unknown). */
  cityRu: string
}

interface AirportDb {
  list: AirportRecord[]
  byIcao: Map<string, AirportRecord>
  byIata: Map<string, AirportRecord>
}

let dbPromise: Promise<AirportDb> | null = null
let dbReady: AirportDb | null = null

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ё/g, 'е')

export function loadAirports(): Promise<AirportDb> {
  if (!dbPromise) {
    dbPromise = fetch(`${import.meta.env.BASE_URL}data/airports.json`)
      .then((r) => r.json())
      .then((raw: { fields: string[]; rows: (string | number)[][] }) => {
        const list: AirportRecord[] = raw.rows.map((r) => {
          const [icao, iata, name, fullName, city, country, lat, lon, kind, network, ru, wiki, cityRu = ''] = r as [
            string, string, string, string, string, string, number, number, string, number, string, string, string,
          ]
          return {
            icao, iata, name, fullName, city, country, lat, lon, wiki,
            size: kind[0] as AirportRecord['size'], scheduled: kind[1] === '1', network, ru,
            hay: fold(`${icao} ${iata} ${fullName} ${city} ${ru}`),
            cityKey: fold(city),
            cityRu,
          }
        })
        const byIcao = new Map(list.map((a) => [a.icao, a]))
        const byIata = new Map(list.filter((a) => a.iata).map((a) => [a.iata, a]))
        dbReady = { list, byIcao, byIata }
        return dbReady
      })
  }
  return dbPromise
}

export function airportSync(icao: string): AirportRecord | undefined {
  return dbReady?.byIcao.get(icao.toUpperCase())
}

export function useAirportDb() {
  const [db, setDb] = useState<AirportDb | null>(dbReady)
  useEffect(() => {
    if (!db) loadAirports().then(setDb).catch(() => undefined)
  }, [db])
  return db
}

export function toRef(a: AirportRecord): AirportRef {
  return { icao: a.icao, iata: a.iata, name: a.name, city: a.city, cityRu: a.cityRu, country: a.country, lat: a.lat, lon: a.lon, wiki: a.wiki }
}

/** City caption in the banner language. */
export const cityName = (a: { city: string; cityRu?: string } | undefined | null, lang: 'ru' | 'en') =>
  !a ? '' : lang === 'ru' && a.cityRu ? a.cityRu : a.city

/**
 * Ranked search over ICAO / IATA / name / city / Russian aliases.
 * Exact code hits first, then prefix hits, then substring hits; bigger and
 * VA-network airports float up inside each tier.
 */
export function searchAirports(db: AirportDb, query: string, opts: { networkBit?: number; limit?: number } = {}): AirportRecord[] {
  const q = fold(query.trim())
  if (!q) return []
  const limit = opts.limit ?? 12
  const brandBit = opts.networkBit ?? 0
  const upper = query.trim().toUpperCase()
  const scored: { a: AirportRecord; s: number }[] = []
  const words = q.split(/\s+/).filter(Boolean)

  for (const a of db.list) {
    let s = -1
    if (a.icao === upper) s = 1000
    else if (a.iata && a.iata === upper) s = 900
    else if (a.icao.startsWith(upper) && upper.length >= 2) s = 600
    else {
      const city = a.cityKey
      if (city === q) s = 560
      else if (city.startsWith(q)) s = 460
      else if (words.every((w) => a.hay.includes(w))) {
        s = 300
        if (a.hay.includes(` ${words[0]}`) || a.hay.startsWith(words[0])) s += 60
      }
    }
    if (s < 0) continue
    s += a.size === 'L' ? 40 : a.size === 'M' ? 20 : 0
    if (a.scheduled) s += 15
    if (brandBit && a.network & brandBit) s += 55
    else if (a.network) s += 20
    if (a.network & 4) s += 10
    scored.push({ a, s })
  }
  scored.sort((x, y) => y.s - x.s)
  return scored.slice(0, limit).map((x) => x.a)
}

/** All airports of a city, biggest first — used when a city is picked instead of an airport. */
export function airportsInCity(db: AirportDb, city: string, country?: string) {
  const c = fold(city)
  return db.list
    .filter((a) => a.cityKey === c && (!country || a.country === country))
    .sort((a, b) => (a.size > b.size ? 1 : a.size < b.size ? -1 : 0))
}

export function greatCircleNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 3440.065
  const toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad
  const dLon = (b.lon - a.lon) * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
