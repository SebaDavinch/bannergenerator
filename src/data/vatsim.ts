import { useEffect, useState } from 'react'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export interface Division { id: string; ru: string; en: string; firCount: number }
export interface Fir {
  id: string
  name: string
  division: string
  region: string
  oceanic: boolean
  sector: boolean
  parent: string | null
  label: [number, number]
}
export interface VatsimCountry { name: string; prefix: string; facility: string }

export interface VatsimDb {
  divisions: Division[]
  firs: Fir[]
  firById: Map<string, Fir>
  countries: VatsimCountry[]
  airportFir: Record<string, string>
  shapes: Map<string, Feature<Polygon | MultiPolygon>>
}

let promise: Promise<VatsimDb> | null = null
let ready: VatsimDb | null = null

export function loadVatsim(): Promise<VatsimDb> {
  if (!promise) {
    const base = import.meta.env.BASE_URL
    promise = Promise.all([
      fetch(`${base}data/vatsim.json`).then((r) => r.json()),
      fetch(`${base}data/firs.json`).then((r) => r.json() as Promise<FeatureCollection<Polygon | MultiPolygon>>),
    ]).then(([meta, shapes]) => {
      ready = {
        divisions: meta.divisions,
        firs: meta.firs,
        firById: new Map((meta.firs as Fir[]).map((f) => [f.id, f])),
        countries: meta.countries,
        airportFir: meta.airportFir,
        shapes: new Map(shapes.features.map((f) => [String(f.id), f])),
      }
      return ready
    })
  }
  return promise
}

export function useVatsimDb() {
  const [db, setDb] = useState<VatsimDb | null>(ready)
  useEffect(() => {
    if (!db) loadVatsim().then(setDb).catch(() => undefined)
  }, [db])
  return db
}

/** Country name for a FIR from the VATSpy ICAO-prefix table (two-letter prefix wins over one-letter). */
export function firCountry(db: VatsimDb, firId: string) {
  return (
    db.countries.find((c) => c.prefix.length === 2 && firId.startsWith(c.prefix))?.name ??
    db.countries.find((c) => c.prefix.length === 1 && firId.startsWith(c.prefix))?.name ??
    ''
  )
}

/**
 * vACC-style groups for a division: top-level FIRs grouped by country
 * (VATEUD vACCs map ~1:1 to countries; VATRUS groups the Russian ACCs).
 */
export function divisionGroups(db: VatsimDb, divisionId: string) {
  const groups = new Map<string, Fir[]>()
  for (const f of db.firs) {
    if (f.division !== divisionId || f.sector) continue
    const country = firCountry(db, f.id) || f.id.slice(0, 2)
    if (!groups.has(country)) groups.set(country, [])
    groups.get(country)!.push(f)
  }
  return [...groups.entries()].map(([country, firs]) => ({ country, firs: firs.sort((a, b) => a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.country.localeCompare(b.country))
}

/** Curated quick picks — the regions Nordwind/RAG events actually go to. */
export const REGION_PRESETS: { id: string; ru: string; en: string; division: string; firs: string[] }[] = [
  { id: 'moscow', ru: 'Москва', en: 'Moscow', division: 'VATRUS', firs: ['UUWV'] },
  { id: 'spb', ru: 'Санкт-Петербург', en: 'Saint Petersburg', division: 'VATRUS', firs: ['ULLL'] },
  { id: 'caucasus', ru: 'Кавказ', en: 'Caucasus', division: 'VATRUS', firs: ['URRV', 'UGGG', 'UDDD', 'UBBA'] },
  { id: 'south', ru: 'Юг России', en: 'South Russia', division: 'VATRUS', firs: ['URRV'] },
  { id: 'volga', ru: 'Поволжье', en: 'Volga', division: 'VATRUS', firs: ['UWWW'] },
  { id: 'urals', ru: 'Урал', en: 'Urals', division: 'VATRUS', firs: ['USSV', 'USTV'] },
  { id: 'siberia', ru: 'Сибирь', en: 'Siberia', division: 'VATRUS', firs: ['UNNT', 'UNKL', 'UIII'] },
  { id: 'kaliningrad', ru: 'Калининград', en: 'Kaliningrad', division: 'VATRUS', firs: ['UMKK'] },
  { id: 'belarus', ru: 'Беларусь', en: 'Belarus', division: 'VATRUS', firs: ['UMMV'] },
  { id: 'central-asia', ru: 'Центральная Азия', en: 'Central Asia', division: 'VATRUS', firs: ['UAAA', 'UTAA', 'UTDD', 'UAII'] },
  { id: 'turkey', ru: 'Турция', en: 'Turkey', division: 'VATEUD', firs: ['LTAA', 'LTBB'] },
  { id: 'germany', ru: 'Германия', en: 'Germany', division: 'VATEUD', firs: ['EDGG', 'EDMM', 'EDWW'] },
]
