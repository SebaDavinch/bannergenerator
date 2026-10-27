import { apiBase } from '../data/fleet'
import type { Brand } from '../types'
import { commonsCategory, commonsSearch, dedupe, rateForBanner, type PhotoCandidate } from './commons'

const AIRLINE_NAMES: Record<Brand, string[]> = {
  nws: ['Nordwind Airlines', 'Pegas Fly', 'Ikar'],
  rag: ['Rossiya Airlines', 'Aeroflot', 'Pobeda'],
}

const TYPE_NAMES: Record<string, string> = {
  A319: 'Airbus A319', A320: 'Airbus A320', A20N: 'Airbus A320neo', A321: 'Airbus A321', A21N: 'Airbus A321neo',
  A332: 'Airbus A330-200', A333: 'Airbus A330-300', A359: 'Airbus A350-900', B734: 'Boeing 737-400', B735: 'Boeing 737-500',
  B737: 'Boeing 737-700', B738: 'Boeing 737-800', B739: 'Boeing 737-900', B38M: 'Boeing 737 MAX 8', B762: 'Boeing 767-200',
  B763: 'Boeing 767-300', B772: 'Boeing 777-200', B773: 'Boeing 777-300', B77W: 'Boeing 777-300ER', B788: 'Boeing 787-8',
  B789: 'Boeing 787-9', E170: 'Embraer 170', E190: 'Embraer 190', E195: 'Embraer 195', SU95: 'Sukhoi Superjet 100', AT75: 'ATR 72-500',
  AT76: 'ATR 72-600', DH8D: 'Dash 8 Q400',
}

export const typeName = (code: string) => TYPE_NAMES[code.toUpperCase()] ?? code

async function fromBackend(reg: string, brand: Brand, signal?: AbortSignal): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({ source: brand === 'rag' ? 'rag' : 'vnws', limit: '8' })
  const res = await fetch(`${apiBase()}/aircraft/photos/${encodeURIComponent(reg)}?${params}`, { signal })
  if (!res.ok) return []
  const body = (await res.json()) as { items: { provider: string; image_url: string; thumbnail_url?: string; attribution?: string; linkback?: string }[] }
  return body.items.map((p) => ({
    url: p.image_url, thumb: p.thumbnail_url || p.image_url, title: reg, credit: [p.attribution, p.provider].filter(Boolean).join(' · '),
    // Backend sources (JetPhotos full-size, vAMSYS) are registration-exact; trust them.
    width: 2000, height: 1200, score: 95, provider: p.provider, link: p.linkback,
  }))
}

async function fromPlanespotters(reg: string, signal?: AbortSignal): Promise<PhotoCandidate[]> {
  const res = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`, { signal })
  if (!res.ok) return []
  const body = (await res.json()) as { photos?: { thumbnail_large?: { src: string; size: { width: number; height: number } }; thumbnail?: { src: string }; link: string; photographer: string }[] }
  return (body.photos ?? []).filter((p) => p.thumbnail_large).map((p) => ({
    url: p.thumbnail_large!.src, thumb: p.thumbnail?.src ?? p.thumbnail_large!.src, title: reg, credit: `© ${p.photographer} · Planespotters.net`,
    width: p.thumbnail_large!.size.width, height: p.thumbnail_large!.size.height,
    // Exact registration but small rendition: keep below full-size sources.
    score: 55, provider: 'Planespotters', link: p.link,
  }))
}

/**
 * Exact-registration photos first (backend JetPhotos/vAMSYS, Commons
 * "Category:<REG> (aircraft)", Planespotters), then same-type photos in the
 * VA's livery as a fallback when the registration has no coverage.
 */
export async function searchAircraftPhotos(opts: { reg: string; type: string; brand: Brand }, signal?: AbortSignal) {
  const reg = opts.reg.trim().toUpperCase()
  const tasks: Promise<PhotoCandidate[]>[] = []
  if (reg) {
    tasks.push(fromBackend(reg, opts.brand, signal).catch(() => []))
    tasks.push(commonsCategory(`${reg} (aircraft)`, signal).then((l) => l.map((c) => ({ ...c, score: 80 + rateForBanner(c) }))).catch(() => []))
    tasks.push(commonsSearch(`"${reg}"`, signal, 20).then((l) => l.filter((c) => c.title.toUpperCase().replace(/\s/g, '').includes(reg.replace(/\s/g, ''))).map((c) => ({ ...c, score: 70 + rateForBanner(c) }))).catch(() => []))
    tasks.push(fromPlanespotters(reg, signal).catch(() => []))
  }
  const exact = (await Promise.all(tasks)).flat()
  let all = exact
  if (exact.filter((c) => c.score >= 80).length < 3 && opts.type) {
    const model = typeName(opts.type)
    const lists = await Promise.all(
      AIRLINE_NAMES[opts.brand].slice(0, 2).map((airline) => commonsSearch(`${airline} ${model}`, signal, 20).catch(() => [])),
    )
    const modelKey = model.split(' ').slice(-1)[0].toLowerCase()
    all = [...exact, ...lists.flat().filter((c) => c.title.toLowerCase().includes(modelKey)).map((c) => ({ ...c, score: 20 + rateForBanner(c) }))]
  }
  return dedupe(all).sort((a, b) => b.score - a.score).slice(0, 16)
}
