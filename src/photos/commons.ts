/** Thin helpers over the Wikimedia Commons / Wikipedia / Wikidata public APIs (all CORS-enabled). */

export interface PhotoCandidate {
  /** Large rendition (≤ 3200px) used for the banner. */
  url: string
  thumb: string
  title: string
  credit: string
  width: number
  height: number
  score: number
  provider: string
  link?: string
  /** Commons page title ("File:…") when the photo comes from Commons. */
  file?: string
}

const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const SPARQL = 'https://query.wikidata.org/sparql'

const BAD_FILE = /\.(svg|gif|pdf|djvu|webm|ogv|tiff?)$/i
export const JUNK_TITLE =
  /interior|inside|cabin|cockpit|seat|menu|diagram|logo|ticket|boarding|meal|food|floor ?plan|plan of|map\b|karte|карта|coat of arms|герб|flag of|seal|stamp|coin|banknote|drawing|painting|engraving|lithograph|portrait|icon|scheme|схема|document|letter|signature|grave|tomb|memorial plaque|plaque|sign\b|queue|crowd|passengers|luggage|baggage|check-?in|lounge|concourse|toilet|museum exhibit|exhibit|statue detail|detail/i

const strip = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

async function api<T>(base: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(`${base}?${qs}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface ImageInfoPage {
  title: string
  imageinfo?: { url: string; thumburl?: string; width: number; height: number; thumbwidth?: number; descriptionurl?: string; extmetadata?: Record<string, { value: string }> }[]
}

function creditOf(meta: Record<string, { value: string }> | undefined) {
  const artist = strip(meta?.Artist?.value).slice(0, 60)
  const license = strip(meta?.LicenseShortName?.value)
  return [artist, license].filter(Boolean).join(' · ') || 'Wikimedia Commons'
}

function toCandidates(pages: ImageInfoPage[], thumbs: Map<string, string>, provider = 'Wikimedia Commons'): PhotoCandidate[] {
  const out: PhotoCandidate[] = []
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii || BAD_FILE.test(p.title)) continue
    out.push({
      url: ii.thumburl || ii.url,
      thumb: thumbs.get(p.title) || ii.thumburl || ii.url,
      title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
      credit: creditOf(ii.extmetadata),
      width: ii.width,
      height: ii.height,
      score: 0,
      provider,
      link: ii.descriptionurl,
      file: p.title,
    })
  }
  return out
}

/** imageinfo for a set of File: titles (or a generator) in large + thumb sizes. */
export async function commonsImages(params: Record<string, string>, signal?: AbortSignal): Promise<PhotoCandidate[]> {
  const base = { action: 'query', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiextmetadatafilter: 'Artist|LicenseShortName', ...params }
  const [large, small] = await Promise.all([
    api<{ query?: { pages?: Record<string, ImageInfoPage> } }>(COMMONS, { ...base, iiurlwidth: '3200' }, signal),
    api<{ query?: { pages?: Record<string, ImageInfoPage> } }>(COMMONS, { ...base, iiurlwidth: '560', iiprop: 'url' }, signal).catch(() => null),
  ])
  const thumbs = new Map<string, string>()
  for (const p of Object.values(small?.query?.pages ?? {})) {
    const t = p.imageinfo?.[0]?.thumburl
    if (t) thumbs.set(p.title, t)
  }
  return toCandidates(Object.values(large.query?.pages ?? {}), thumbs)
}

export async function commonsFiles(fileTitles: string[], signal?: AbortSignal) {
  const out: PhotoCandidate[] = []
  for (let i = 0; i < fileTitles.length; i += 40) {
    const chunk = fileTitles.slice(i, i + 40)
    out.push(...(await commonsImages({ titles: chunk.join('|') }, signal)))
  }
  return out
}

export function commonsSearch(query: string, signal?: AbortSignal, limit = 30) {
  return commonsImages({ generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit) }, signal)
}

export function commonsCategory(category: string, signal?: AbortSignal, limit = 40) {
  return commonsImages({ generator: 'categorymembers', gcmtitle: `Category:${category}`, gcmtype: 'file', gcmlimit: String(limit) }, signal)
}

export async function sparql<T = Record<string, { value: string }>>(query: string, signal?: AbortSignal): Promise<T[]> {
  const res = await fetch(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`, {
    signal,
    headers: { Accept: 'application/sparql-results+json' },
  })
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`)
  const body = await res.json()
  return body.results.bindings as T[]
}

export async function wikipediaQid(title: string, lang = 'en', signal?: AbortSignal): Promise<string | null> {
  const body = await api<{ query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string; disambiguation?: string } }> } }>(
    `https://${lang}.wikipedia.org/w/api.php`,
    { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item|disambiguation', redirects: '1', titles: title },
    signal,
  )
  const page = Object.values(body.query?.pages ?? {})[0]
  if (!page?.pageprops || 'disambiguation' in page.pageprops) return null
  return page.pageprops.wikibase_item ?? null
}

export const fileTitleFromCommonsUrl = (url: string) =>
  'File:' + decodeURIComponent(url.replace(/^.*Special:FilePath\//, '')).replace(/_/g, ' ')

/** Banner-suitability: landscape, large, not junk. */
export function rateForBanner(c: PhotoCandidate) {
  const ratio = c.width / Math.max(1, c.height)
  let s = 0
  if (ratio >= 1.25 && ratio <= 2.6) s += 30
  else if (ratio >= 1.05) s += 8
  else s -= 40
  if (c.width >= 2400) s += 20
  else if (c.width >= 1600) s += 10
  else if (c.width < 1000) s -= 30
  if (JUNK_TITLE.test(c.title)) s -= 60
  return s
}

export function dedupe(list: PhotoCandidate[]) {
  const seen = new Set<string>()
  return list.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)))
}
