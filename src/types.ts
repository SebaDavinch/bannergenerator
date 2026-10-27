/** vAMSYS project id (see data/projects.ts). */
export type Brand = string
export type Locale = 'ru' | 'en'

export type ModeId =
  | 'focus-airport'
  | 'tour'
  | 'roster'
  | 'curated-roster'
  | 'community-challenge'
  | 'community-goal'
  | 'slotted'
  | 'event'
  | 'vatsim-region'

export type CountType = 'flights' | 'passengers' | 'freight' | 'distance' | 'flight-time'

export interface AirportRef {
  icao: string
  iata: string
  name: string
  city: string
  cityRu?: string
  country: string
  lat: number
  lon: number
  wiki?: string
}

export interface Leg {
  id: string
  from: string
  to: string
  /** Flight number or short note (curated roster schedule). */
  note?: string
}

/** A background photo plus the framing the user chose for it. */
export interface PhotoState {
  /** Remote source URL (persisted). Empty when nothing is picked. */
  src: string
  /** Local data URL for uploads (persisted only when small enough). */
  local?: string
  credit?: string
  title?: string
  /** Focus point in percent (object-position). */
  x: number
  y: number
  /** 1 = cover, up to 2.5. */
  zoom: number
  /** Dark overlay 0..1. */
  dim: number
  blur: number
  /** Picked automatically from search results (replaced on the next auto search). */
  auto?: boolean
}

export type MapProjectionKind = 'mercator' | 'conic' | 'natural' | 'globe'
export type MapTheme = 'night' | 'dusk' | 'steel' | 'terrain' | 'atlas' | 'polar' | 'brand'

export interface MapView {
  projection: MapProjectionKind
  theme: MapTheme
  /** Multiplier over the auto-fit scale. */
  zoom: number
  /** Pixel offset (1920x1080 stage space) over the auto-fit translate. */
  dx: number
  dy: number
  locked: boolean
  borders: boolean
  graticule: boolean
  labels: boolean
  /** 0..1 strength of the dark guard under the text column. */
  guard: number
  /** Where the route is fitted: the free area right of the text, or the full banner. */
  frame: 'content' | 'full'
  /** Shaded relief from elevation tiles. */
  relief: boolean
  /** Relief exaggeration multiplier (0.3..3). */
  reliefStrength: number
  rivers: boolean
  cities: boolean
  /** Number stops along the route (1, 2, 3…). */
  numbers: boolean
  /** Airport chip content. */
  labelMode: 'icao' | 'icao-city' | 'city'
  routeStyle: 'solid' | 'dashed' | 'dotted'
  routeWidth: number
}

export interface AircraftRef {
  reg: string
  type: string
  model: string
  va: Brand | ''
}

export type VisualMode = 'aircraft' | 'map' | 'photo'

interface Common {
  bonusPoints: string
  registrationRequired: boolean
  /** Small top-right caption, e.g. "APRIL 2026". */
  period: string
}

export interface FocusData extends Common {
  airport: AirportRef | null
  cityOverride: string
  tagline: string
  photo: PhotoState
}

export interface TourData extends Common {
  /** chips = leg chips + stats; itinerary = numbered stop list synced with map numbers. */
  layout: 'chips' | 'itinerary'
  title: string
  description: string
  legs: Leg[]
  map: MapView
}

export interface RosterData extends Common {
  title: string
  description: string
  legs: Leg[]
  visual: VisualMode
  aircraft: AircraftRef
  photo: PhotoState
  map: MapView
}

export interface Team {
  id: string
  name: string
  countType: CountType
  target: string
  /** Optional current value; shows a progress bar on the banner. */
  current?: string
}

export type ChallengeScene = 'versus' | 'photo' | 'runways' | 'holding' | 'board' | 'contrails'
export type GoalScene = 'gauge' | 'radar' | 'cockpit' | 'approach' | 'board' | 'contrails'

export interface ChallengeData extends Common {
  scene: ChallengeScene
  title: string
  description: string
  teams: Team[]
  photoQuery: string
  photo: PhotoState
}

export interface GoalData extends Common {
  scene: GoalScene
  title: string
  description: string
  countType: CountType
  target: string
  progress: string
  radar: {
    fir: string
    sectors: boolean
    traffic: number
    seed: number
    rings: boolean
  }
}

export interface Wave {
  id: string
  label: string
  openTime: string
  condition: string
}

export interface SlottedData extends Common {
  title: string
  network: string
  date: string
  bookingUrl: string
  showQr: boolean
  legs: Leg[]
  waves: Wave[]
  visual: VisualMode
  aircraft: AircraftRef
  photo: PhotoState
  map: MapView
}

export interface CollabData {
  /** Host and partner project ids. */
  projects: [string, string]
  /** routes = one map with both projects' legs; focus = a shared focus airport over a photo. */
  layout: 'routes' | 'focus'
  /** split = a reward per project; merged = one shared reward for both. */
  pointsMode: 'split' | 'merged'
  /** Shared reward (pointsMode = merged). */
  bonus: string
  registration: boolean
  /** Focus layout. */
  airport: AirportRef | null
  cityOverride: string
  tagline: string
  photo: PhotoState
  title: string
  description: string
  period: string
  partners: string
  vnwsLegs: Leg[]
  ragLegs: Leg[]
  vnwsBonus: string
  ragBonus: string
  vnwsRegistration: boolean
  ragRegistration: boolean
  map: MapView
}

export type VatsimEventKind = 'shuttle' | 'online-day' | 'overload' | 'cross-region'

export interface VatsimData extends Common {
  kind: VatsimEventKind
  title: string
  description: string
  date: string
  timeStart: string
  timeEnd: string
  divisions: string[]
  firs: string[]
  /** Focus airports: shuttle endpoints, overload fields, online-day majors. */
  airports: string[]
  /** Overload: feeder airports that converge on the focus airports. */
  feeders: string[]
  positions: string
  hosts: string
  logos: string[]
  /** Cross-region: the two projects whose legs are drawn. */
  projects: [string, string]
  vnwsLegs: Leg[]
  ragLegs: Leg[]
  map: MapView
}

export interface ModeDataMap {
  'focus-airport': FocusData
  tour: TourData
  roster: RosterData
  'curated-roster': RosterData
  'community-challenge': ChallengeData
  'community-goal': GoalData
  slotted: SlottedData
  event: CollabData
  'vatsim-region': VatsimData
}

export interface StudioState {
  locale: Locale
  bannerLang: Locale
  brand: Brand
  mode: ModeId
  data: ModeDataMap
}
