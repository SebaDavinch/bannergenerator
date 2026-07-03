export type Badge3DShape = 'circle' | 'rounded-square' | 'shield' | 'hexagon'

export type FrameMaterial = 'silver' | 'gold' | 'bronze' | 'navy'

export type PhotoLayerMask = 'full' | 'bottom' | 'top' | 'circle'

export type PhotoLayerBlend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'luminosity'

export type PhotoLayer = {
  id: string
  src: string
  label: string
  /** Offset of the image centre relative to badge centre, in viewBox px. */
  x: number
  y: number
  scale: number
  opacity: number
  blend: PhotoLayerBlend
  mask: PhotoLayerMask
  /** Soft edge width of the mask, in viewBox px (0 = hard edge). */
  feather: number
  brightness: number
  contrast: number
  saturation: number
  visible: boolean
}

export type RibbonPlacement = 'none' | 'bottom' | 'sides' | 'left' | 'right'
export type ContrailVariant = 'arc' | 'climb' | 'loop'
export type TextMaterialId = 'chrome' | 'gold' | 'enamel' | 'neon' | 'flat'

/**
 * Hand-authored ribbon centerlines (artist curves, not sines). Values in
 * -1..1 (positive = down), scaled by amplitude. Each curve enters and
 * leaves the frame at a gentle angle — no flat spots, no abrupt kinks.
 */
export const AUTHORED_CURVES: Array<{ id: string; labelRu: string; labelEn: string; points: Array<[number, number]> }> = [
  {
    id: 's-sweep',
    labelRu: 'S-изгиб',
    labelEn: 'S-sweep',
    // Long rise to a left-of-center crest, deep dip right, relaxed tail.
    points: [[0, -0.1], [0.14, 0.5], [0.38, 1], [0.55, 0.35], [0.72, -0.75], [0.88, -1], [1, -0.55]],
  },
  {
    id: 'bowl',
    labelRu: 'Чаша',
    labelEn: 'Bowl',
    // Sash sagging through the middle, ends tucked high behind the frame.
    points: [[0, -0.85], [0.18, -0.1], [0.42, 0.75], [0.58, 0.75], [0.82, -0.1], [1, -0.85]],
  },
  {
    id: 'crest',
    labelRu: 'Гребень',
    labelEn: 'Crest',
    // Proud arch over the center, dipping at both frame edges.
    points: [[0, 0.75], [0.2, 0], [0.44, -0.8], [0.56, -0.8], [0.8, 0], [1, 0.75]],
  },
  {
    id: 'double',
    labelRu: 'Двойная',
    labelEn: 'Double',
    // Two unequal crests, like cloth pinched twice; softened transitions.
    points: [[0, 0.15], [0.13, -0.7], [0.3, 0.45], [0.47, 1], [0.64, 0.1], [0.8, -0.85], [0.92, -0.55], [1, 0.05]],
  },
]

export type Badge3DState = {
  shape: Badge3DShape
  frameMaterial: FrameMaterial
  frameAccent: string
  frameWidth: number
  bgTop: string
  bgBottom: string
  layers: PhotoLayer[]
  selectedLayerId: string | null
  scrimOpacity: number
  scrimHeight: number
  year: string
  line2: string
  plateText: string
  flagCountry: string
  yearFont: string
  yearSize: number
  yearMaterial: TextMaterialId
  yearDepth: number
  yearArch: number
  yearY: number
  line2Font: string
  line2Size: number
  line2Material: TextMaterialId
  line2Wings: boolean
  ribbonPlacement: RibbonPlacement
  ribbonAmplitude: number
  ribbonWaves: number
  ribbonCurve: number
  ribbonHeight: number
  ribbonY: number
  planeEnabled: boolean
  planeVariant: ContrailVariant
  planeX: number
  planeY: number
  planeScale: number
  wingsTopEnabled: boolean
  flagIconEnabled: boolean
  flagIconX: number
  flagIconY: number
  flagIconScale: number
}

export const BADGE3D_VIEWBOX = 512

export function flagUrlFor(country: string): string {
  return `https://flagcdn.com/${country}.svg`
}

/** Professionally drawn waving-flag icon (Flagpedia, public domain, 254 countries). */
export function flagWavingUrlFor(country: string): string {
  return `https://flagcdn.com/256x192/${country}.png`
}

export function createPhotoLayer(src: string, label: string): PhotoLayer {
  return {
    id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    src,
    label,
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    blend: 'normal',
    mask: 'full',
    feather: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    visible: true,
  }
}

export function createDefaultBadge3DState(): Badge3DState {
  return {
    shape: 'rounded-square',
    frameMaterial: 'silver',
    frameAccent: '#c62828',
    frameWidth: 22,
    bgTop: '#12365c',
    bgBottom: '#071528',
    layers: [],
    selectedLayerId: null,
    scrimOpacity: 0.72,
    scrimHeight: 55,
    year: '2026',
    line2: 'EVENT PARTICIPANT',
    plateText: 'URSS',
    flagCountry: 'ru',
    yearFont: "'Russo One', sans-serif",
    yearSize: 120,
    yearMaterial: 'chrome',
    yearDepth: 8,
    yearArch: 6,
    yearY: 302,
    line2Font: "'Oswald', sans-serif",
    line2Size: 30,
    line2Material: 'chrome',
    line2Wings: true,
    ribbonPlacement: 'bottom',
    ribbonAmplitude: 9,
    ribbonWaves: 1,
    ribbonCurve: 0,
    ribbonHeight: 64,
    ribbonY: 442,
    planeEnabled: true,
    planeVariant: 'arc',
    planeX: 388,
    planeY: 86,
    planeScale: 0.85,
    wingsTopEnabled: false,
    flagIconEnabled: false,
    flagIconX: 118,
    flagIconY: 120,
    flagIconScale: 1,
  }
}
