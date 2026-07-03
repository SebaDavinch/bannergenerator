import { createDefaultBadge3DState, createPhotoLayer, type Badge3DState } from './types'
import { searchAllSources, fetchAsDataUrl, type PhotoCandidate, type PhotoSourceKeys } from './photoSearch'
import { findCityBackdrops } from './cityBackdrops'
import { THEME_PRESETS } from './presets'

export type AutoVariant = {
  id: string
  themeLabelRu: string
  themeLabelEn: string
  photoThumb: string
  attribution: string
  state: Badge3DState
}

type PhotoTone = {
  luminance: number
  warmth: number
}

/** Average luminance and warm/cool bias of a thumbnail. */
async function analyzeTone(thumbUrl: string): Promise<PhotoTone> {
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('thumb load failed'))
      image.src = thumbUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      return { luminance: 128, warmth: 0 }
    }
    context.drawImage(image, 0, 0, 32, 32)
    const data = context.getImageData(0, 0, 32, 32).data
    let r = 0
    let g = 0
    let b = 0
    for (let index = 0; index < data.length; index += 4) {
      r += data[index]
      g += data[index + 1]
      b += data[index + 2]
    }
    const n = data.length / 4
    r /= n
    g /= n
    b /= n
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, warmth: r - b }
  } catch {
    return { luminance: 128, warmth: 0 }
  }
}

/** Design rule: photo tone → theme. Sunset warm → retro, dark → chrome night, cool bright → winter/gold. */
function pickThemeId(tone: PhotoTone, usedThemes: Set<string>): string {
  const preference: string[] = []
  if (tone.warmth > 22) {
    preference.push('retro-travel', 'gold-medal')
  }
  if (tone.luminance < 95) {
    preference.push('chrome-night', 'hitech')
  }
  if (tone.warmth <= 22 && tone.luminance >= 95) {
    preference.push('winter-ops', 'chrome-night', 'gold-medal')
  }
  preference.push(...THEME_PRESETS.map((preset) => preset.id))
  const fresh = preference.find((id) => !usedThemes.has(id))
  return fresh ?? preference[0]
}

export type AutoGenerateInput = {
  city: string
  eventName: string
  year: string
  callsign: string
  flagCountry: string
  keys: PhotoSourceKeys
  signal: AbortSignal
}

/**
 * The "assemble for me" pipeline: association queries for the city →
 * photo candidates → tone analysis → theme pairing → 3-4 ready variants.
 */
export async function generateVariants(input: AutoGenerateInput): Promise<AutoVariant[]> {
  const backdrops = findCityBackdrops(input.city)
  const queries = backdrops
    ? backdrops.chips.slice(0, 3).map((chip) => chip.query)
    : [`${input.city} city landmark aerial`, `${input.city} skyline sunset`]

  // Fan out all queries, gather a diverse candidate pool.
  const settled = await Promise.allSettled(
    queries.map((query) => searchAllSources(query, input.keys, input.signal)),
  )
  const pool: PhotoCandidate[] = []
  const seen = new Set<string>()
  settled.forEach((result) => {
    if (result.status === 'fulfilled') {
      result.value.forEach((candidate) => {
        if (!seen.has(candidate.id)) {
          seen.add(candidate.id)
          pool.push(candidate)
        }
      })
    }
  })
  if (pool.length === 0) {
    return []
  }

  // Prefer one candidate per source for visual diversity, up to 4.
  const bySource = new Map<string, PhotoCandidate[]>()
  pool.forEach((candidate) => {
    const bucket = bySource.get(candidate.sourceLabel) ?? []
    bucket.push(candidate)
    bySource.set(candidate.sourceLabel, bucket)
  })
  const picks: PhotoCandidate[] = []
  const buckets = [...bySource.values()]
  for (let round = 0; picks.length < 4 && buckets.some((bucket) => bucket.length > round); round += 1) {
    buckets.forEach((bucket) => {
      if (picks.length < 4 && bucket[round]) {
        picks.push(bucket[round])
      }
    })
  }

  const usedThemes = new Set<string>()
  const variants: AutoVariant[] = []
  for (const candidate of picks) {
    if (input.signal.aborted) {
      break
    }
    const tone = await analyzeTone(candidate.thumbUrl)
    const themeId = pickThemeId(tone, usedThemes)
    usedThemes.add(themeId)
    const preset = THEME_PRESETS.find((entry) => entry.id === themeId) ?? THEME_PRESETS[0]
    let photoData: string
    try {
      photoData = await fetchAsDataUrl(candidate.fullUrl, input.signal)
    } catch {
      try {
        photoData = await fetchAsDataUrl(candidate.thumbUrl, input.signal)
      } catch {
        continue
      }
    }
    const layer = createPhotoLayer(photoData, candidate.attribution)
    layer.scale = 1.15
    const state: Badge3DState = {
      ...createDefaultBadge3DState(),
      ...preset.patch,
      layers: [layer],
      selectedLayerId: layer.id,
      year: input.year || '2026',
      line2: (input.eventName || 'EVENT PARTICIPANT').toUpperCase(),
      plateText: input.callsign || input.city.toUpperCase().slice(0, 10),
      flagCountry: input.flagCountry,
    }
    variants.push({
      id: candidate.id,
      themeLabelRu: preset.labelRu,
      themeLabelEn: preset.labelEn,
      photoThumb: candidate.thumbUrl,
      attribution: candidate.attribution,
      state,
    })
  }
  return variants
}
