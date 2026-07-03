export type PhotoCandidate = {
  id: string
  thumbUrl: string
  fullUrl: string
  title: string
  attribution: string
  sourceLabel: 'Wikimedia' | 'Pexels' | 'Pixabay' | 'Unsplash' | 'Openverse'
  width: number
  height: number
}

export type PhotoSourceKeys = {
  pexels?: string
  pixabay?: string
  unsplash?: string
}

const STOP_TOKENS =
  /(interior|indoor|room|office|bedroom|kitchen|bathroom|wall texture|table|desk|food|meal|dish|portrait|selfie|face|man |woman |girl |boy |wedding|logo|screenshot|document|diagram|map of|coat of arms|flag of|drawing|clipart)/i

const MIN_WIDTH = 900

function passesFilters(candidate: PhotoCandidate): boolean {
  if (candidate.width > 0 && candidate.width < MIN_WIDTH) {
    return false
  }
  if (candidate.width > 0 && candidate.height > 0 && candidate.height > candidate.width * 1.2) {
    return false
  }
  return !STOP_TOKENS.test(candidate.title)
}

async function searchWikimedia(query: string, signal: AbortSignal): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '24',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '480',
  })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, { signal })
  if (!response.ok) {
    throw new Error('wikimedia search failed')
  }
  const payload = (await response.json()) as {
    query?: { pages?: Record<string, {
      pageid: number
      title: string
      imageinfo?: Array<{
        thumburl?: string
        url?: string
        width?: number
        height?: number
        extmetadata?: { Artist?: { value?: string } }
      }>
    }> }
  }
  const pages = Object.values(payload.query?.pages ?? {})
  return pages.flatMap((page) => {
    const info = page.imageinfo?.[0]
    if (!info?.thumburl || !info.url) {
      return []
    }
    const artist = (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim()
    return [{
      id: `wm-${page.pageid}`,
      thumbUrl: info.thumburl,
      fullUrl: info.thumburl.replace(/\/480px-/, '/1280px-'),
      title: page.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
      attribution: artist ? `${artist} / Wikimedia Commons` : 'Wikimedia Commons',
      sourceLabel: 'Wikimedia',
      width: info.width ?? 0,
      height: info.height ?? 0,
    } satisfies PhotoCandidate]
  })
}

async function searchPexels(query: string, key: string, signal: AbortSignal): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({ query, per_page: '18', orientation: 'landscape' })
  const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
    headers: { Authorization: key },
    signal,
  })
  if (!response.ok) {
    throw new Error('pexels search failed')
  }
  const payload = (await response.json()) as {
    photos?: Array<{
      id: number
      width: number
      height: number
      alt?: string
      photographer?: string
      src: { large2x?: string; large?: string; medium?: string }
    }>
  }
  return (payload.photos ?? []).flatMap((photo) => {
    const thumb = photo.src.medium ?? photo.src.large
    const full = photo.src.large2x ?? photo.src.large
    if (!thumb || !full) {
      return []
    }
    return [{
      id: `px-${photo.id}`,
      thumbUrl: thumb,
      fullUrl: full,
      title: photo.alt || query,
      attribution: `${photo.photographer ?? 'Unknown'} / Pexels`,
      sourceLabel: 'Pexels',
      width: photo.width,
      height: photo.height,
    } satisfies PhotoCandidate]
  })
}

async function searchPixabay(query: string, key: string, signal: AbortSignal): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({
    key,
    q: query,
    image_type: 'photo',
    orientation: 'horizontal',
    per_page: '18',
    safesearch: 'true',
  })
  const response = await fetch(`https://pixabay.com/api/?${params.toString()}`, { signal })
  if (!response.ok) {
    throw new Error('pixabay search failed')
  }
  const payload = (await response.json()) as {
    hits?: Array<{
      id: number
      tags?: string
      user?: string
      webformatURL?: string
      largeImageURL?: string
      imageWidth: number
      imageHeight: number
    }>
  }
  return (payload.hits ?? []).flatMap((hit) => {
    if (!hit.webformatURL || !hit.largeImageURL) {
      return []
    }
    return [{
      id: `pb-${hit.id}`,
      thumbUrl: hit.webformatURL,
      fullUrl: hit.largeImageURL,
      title: hit.tags || query,
      attribution: `${hit.user ?? 'Unknown'} / Pixabay`,
      sourceLabel: 'Pixabay',
      width: hit.imageWidth,
      height: hit.imageHeight,
    } satisfies PhotoCandidate]
  })
}

async function searchUnsplash(query: string, key: string, signal: AbortSignal): Promise<PhotoCandidate[]> {
  const params = new URLSearchParams({ query, per_page: '18', orientation: 'landscape' })
  const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
    headers: { Authorization: `Client-ID ${key}` },
    signal,
  })
  if (!response.ok) {
    throw new Error('unsplash search failed')
  }
  const payload = (await response.json()) as {
    results?: Array<{
      id: string
      width: number
      height: number
      alt_description?: string
      user?: { name?: string }
      urls: { small?: string; regular?: string }
    }>
  }
  return (payload.results ?? []).flatMap((photo) => {
    if (!photo.urls.small || !photo.urls.regular) {
      return []
    }
    return [{
      id: `us-${photo.id}`,
      thumbUrl: photo.urls.small,
      fullUrl: photo.urls.regular,
      title: photo.alt_description || query,
      attribution: `${photo.user?.name ?? 'Unknown'} / Unsplash`,
      sourceLabel: 'Unsplash',
      width: photo.width,
      height: photo.height,
    } satisfies PhotoCandidate]
  })
}

async function searchOpenverse(query: string, signal: AbortSignal): Promise<PhotoCandidate[]> {
  // Openverse AND-matches every term, so long hand-tuned queries return 0 —
  // keep only the first three words for it.
  const simplified = query.split(/\s+/).slice(0, 3).join(' ')
  // Openverse quirks: '+' is not decoded as space (encode manually) and
  // category=photograph zeroes out multi-word queries (omit it).
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(simplified)}&page_size=18`
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('openverse search failed')
  }
  const payload = (await response.json()) as {
    results?: Array<{
      id: string
      title?: string
      creator?: string
      url?: string
      thumbnail?: string
      width?: number
      height?: number
      source?: string
    }>
  }
  return (payload.results ?? []).flatMap((item) => {
    if (!item.thumbnail || !item.url) {
      return []
    }
    return [{
      id: `ov-${item.id}`,
      thumbUrl: item.thumbnail,
      fullUrl: item.url,
      title: item.title || query,
      attribution: `${item.creator ?? 'Unknown'} / ${item.source ?? 'Openverse'}`,
      sourceLabel: 'Openverse',
      width: item.width ?? 0,
      height: item.height ?? 0,
    } satisfies PhotoCandidate]
  })
}

/**
 * Fan-out search across all configured sources; failures of individual
 * sources are swallowed so one dead API never empties the whole grid.
 */
export async function searchAllSources(
  query: string,
  keys: PhotoSourceKeys,
  signal: AbortSignal,
): Promise<PhotoCandidate[]> {
  const jobs: Array<Promise<PhotoCandidate[]>> = [
    searchWikimedia(query, signal),
    searchOpenverse(query, signal),
  ]
  if (keys.pexels) {
    jobs.push(searchPexels(query, keys.pexels, signal))
  }
  if (keys.pixabay) {
    jobs.push(searchPixabay(query, keys.pixabay, signal))
  }
  if (keys.unsplash) {
    jobs.push(searchUnsplash(query, keys.unsplash, signal))
  }
  const settled = await Promise.allSettled(jobs)
  const merged = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const filtered = merged.filter(passesFilters)
  // Interleave sources so the grid is not dominated by whichever returned first.
  const bySource = new Map<string, PhotoCandidate[]>()
  filtered.forEach((candidate) => {
    const bucket = bySource.get(candidate.sourceLabel) ?? []
    bucket.push(candidate)
    bySource.set(candidate.sourceLabel, bucket)
  })
  const buckets = [...bySource.values()]
  const interleaved: PhotoCandidate[] = []
  for (let index = 0; buckets.some((bucket) => index < bucket.length); index += 1) {
    buckets.forEach((bucket) => {
      if (index < bucket.length) {
        interleaved.push(bucket[index])
      }
    })
  }
  return interleaved.slice(0, 48)
}

/** Download an image and convert to a data URL so exports never hit CORS taint. */
export async function fetchAsDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { mode: 'cors', signal })
  if (!response.ok) {
    throw new Error('image download failed')
  }
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('image decode failed'))
    reader.readAsDataURL(blob)
  })
}
