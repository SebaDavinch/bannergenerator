import type { AirportRef } from '../types'
import {
  commonsFiles, commonsSearch, dedupe, fileTitleFromCommonsUrl, rateForBanner, sparql, wikipediaQid, type PhotoCandidate,
} from './commons'

export interface LandmarkResult {
  city: string
  cityQid: string | null
  photos: (PhotoCandidate & { landmark?: string })[]
}

const cityCache = new Map<string, Promise<string | null>>()

/** Resolve the city an airport serves (P931) — more reliable than a bare name search. */
async function resolveCityQid(airport: AirportRef | null, city: string, signal?: AbortSignal) {
  const key = `${airport?.icao ?? ''}|${city}`
  let p = cityCache.get(key)
  if (!p) {
    p = (async () => {
      if (airport?.wiki) {
        const airportQid = await wikipediaQid(airport.wiki.replace(/_/g, ' '), 'en', signal).catch(() => null)
        if (airportQid) {
          const rows = await sparql(`SELECT ?city WHERE { wd:${airportQid} wdt:P931 ?city . } LIMIT 3`, signal).catch(() => [])
          const qid = rows[0]?.city?.value.split('/').pop()
          if (qid) return qid
        }
      }
      if (city) return await wikipediaQid(city, 'en', signal).catch(() => null)
      return null
    })()
    p.catch(() => cityCache.delete(key))
    cityCache.set(key, p)
  }
  return p
}

/**
 * Most recognizable sights of a city, ranked by Wikidata sitelink count
 * (how many Wikipedias describe the place — a solid fame proxy), plus the
 * city's own skyline / aerial / night views. Administrative units, stations
 * and airports are filtered out so the list reads as "landmarks".
 */
async function wikidataLandmarks(cityQid: string, signal?: AbortSignal) {
  const query = `
SELECT ?item ?itemLabel ?img ?links WHERE {
  {
    SELECT DISTINCT ?item ?links WHERE {
      { ?item wdt:P131 wd:${cityQid} . } UNION { ?item wdt:P131/wdt:P131 wd:${cityQid} . } UNION { ?item wdt:P276 wd:${cityQid} . }
      ?item wikibase:sitelinks ?links .
      FILTER(?links >= 6)
    } ORDER BY DESC(?links) LIMIT 160
  }
  ?item wdt:P18 ?img .
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q56061 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q928830 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q55488 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q1248784 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q43229 . }
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ru". }
} ORDER BY DESC(?links) LIMIT 36`
  const views = `
SELECT ?img ?kind WHERE {
  { wd:${cityQid} wdt:P3451 ?img . BIND("night" AS ?kind) } UNION
  { wd:${cityQid} wdt:P8592 ?img . BIND("aerial" AS ?kind) } UNION
  { wd:${cityQid} wdt:P5252 ?img . BIND("winter" AS ?kind) } UNION
  { wd:${cityQid} wdt:P18 ?img . BIND("main" AS ?kind) }
}`
  const [rows, viewRows] = await Promise.all([
    sparql(query, signal).catch(() => []),
    sparql(views, signal).catch(() => []),
  ])
  const files = new Map<string, { landmark: string; rank: number }>()
  viewRows.forEach((r) => {
    const t = fileTitleFromCommonsUrl(r.img.value)
    const bonus = r.kind.value === 'night' ? 60 : r.kind.value === 'aerial' ? 50 : r.kind.value === 'main' ? 20 : 30
    files.set(t, { landmark: r.kind.value === 'main' ? '' : r.kind.value, rank: bonus })
  })
  rows.forEach((r, i) => {
    const t = fileTitleFromCommonsUrl(r.img.value)
    if (!files.has(t)) files.set(t, { landmark: r.itemLabel?.value ?? '', rank: Math.max(0, 70 - i * 2) + Math.min(40, Number(r.links.value) / 5) })
  })
  const photos = await commonsFiles([...files.keys()], signal)
  return photos.map((p) => {
    const meta = (p.file && files.get(p.file)) || [...files.entries()].find(([k]) => k.toLowerCase() === p.file?.toLowerCase())?.[1]
    return { ...p, landmark: meta?.landmark, score: (meta?.rank ?? 0) + rateForBanner(p) }
  })
}

async function commonsFallback(city: string, signal?: AbortSignal) {
  const queries = [`${city} skyline`, `${city} panorama`, `${city} landmark`]
  const lists = await Promise.all(queries.map((q) => commonsSearch(`${q} -interior -inside`, signal, 20).catch(() => [])))
  const cityKey = city.toLowerCase().split(/\s+/)[0]
  return lists.flat()
    .filter((c) => c.title.toLowerCase().includes(cityKey))
    .map((c) => ({ ...c, score: rateForBanner(c) + (/skyline|panorama|aerial|night/i.test(c.title) ? 20 : 0) }))
}

export async function searchLandmarks(airport: AirportRef | null, cityName: string, signal?: AbortSignal): Promise<LandmarkResult> {
  const city = cityName || airport?.city || ''
  const cityQid = await resolveCityQid(airport, city, signal)
  let photos: LandmarkResult['photos'] = cityQid ? await wikidataLandmarks(cityQid, signal).catch(() => []) : []
  if (photos.filter((p) => p.score > 40).length < 4 && city) photos = [...photos, ...(await commonsFallback(city, signal))]
  photos = dedupe(photos).filter((p) => p.score > -20).sort((a, b) => b.score - a.score).slice(0, 16)
  return { city, cityQid, photos }
}

/** Free-text Commons search for moods ("airport at night") used by Community Challenge. */
export async function searchMood(query: string, signal?: AbortSignal) {
  const list = await commonsSearch(`${query} -interior -diagram -map`, signal, 40)
  return dedupe(list.map((c) => ({ ...c, score: rateForBanner(c) }))).filter((c) => c.score > -10).sort((a, b) => b.score - a.score).slice(0, 16)
}
