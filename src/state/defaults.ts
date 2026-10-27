import type { AirportRef, Leg, MapView, ModeDataMap, PhotoState, StudioState } from '../types'

let idSeq = 0
export const uid = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}`

export const emptyPhoto = (dim = 0): PhotoState => ({ src: '', x: 50, y: 50, zoom: 1, dim, blur: 0 })

export const defaultMap = (patch: Partial<MapView> = {}): MapView => ({
  projection: 'mercator',
  theme: 'night',
  zoom: 1,
  dx: 0,
  dy: 0,
  locked: false,
  borders: true,
  graticule: true,
  labels: true,
  guard: 0.85,
  frame: 'content',
  relief: true,
  reliefStrength: 1,
  rivers: true,
  cities: false,
  numbers: false,
  labelMode: 'icao',
  routeStyle: 'solid',
  routeWidth: 4,
  ...patch,
})

export const legsFrom = (text: string): Leg[] =>
  text
    .split(/\n|;|,/)
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean)
    .map((line) => {
      const [from = '', to = '', note = ''] = line.split(/\s*(?:-|–|→|>|\s)\s*/).filter(Boolean)
      return { id: uid(), from, to, note }
    })

const ULLI: AirportRef = {
  icao: 'ULLI', iata: 'LED', name: 'Pulkovo', city: 'Saint Petersburg', cityRu: 'Санкт-Петербург', country: 'RU', lat: 59.8003, lon: 30.2625, wiki: 'Pulkovo_Airport',
}

export function defaultModeData(): ModeDataMap {
  return {
    'focus-airport': {
      airport: ULLI, cityOverride: '', tagline: '', bonusPoints: '350', registrationRequired: false, period: '',
      photo: { ...emptyPhoto(0.1), src: '', local: '/brand/default-city.jpg' },
    },
    tour: {
      layout: 'chips',
      title: 'Northern Cross Tour', description: 'A route across the northwest and the south of Russia.',
      legs: legsFrom('ULLI-UUEE\nUUEE-URSS\nURSS-ULLI'), bonusPoints: '350', registrationRequired: false, period: '', map: defaultMap(),
    },
    roster: {
      title: 'April Route Roster', description: 'Fly the published legs in the listed order.',
      legs: legsFrom('UUEE-ULLI\nULLI-UUEE\nUUEE-URSS'), visual: 'aircraft',
      aircraft: { reg: '', type: '', model: '', va: '' }, photo: emptyPhoto(0.05), map: defaultMap(),
      bonusPoints: '350', registrationRequired: false, period: '',
    },
    'curated-roster': {
      title: 'Northern Shift Plan', description: 'A personal shift: four sectors, one crew, one aircraft.',
      legs: legsFrom('UUEE-USSS\nUSSS-ULLI\nULLI-UUEE'), visual: 'aircraft',
      aircraft: { reg: '', type: '', model: '', va: '' }, photo: emptyPhoto(0.05), map: defaultMap(),
      bonusPoints: '350', registrationRequired: false, period: '',
    },
    'community-challenge': {
      scene: 'runways', title: 'Spring Community Challenge', description: '',
      teams: [
        { id: uid(), name: 'Team North Star', countType: 'flights', target: '150' },
        { id: uid(), name: 'Team Meridian', countType: 'flights', target: '150' },
      ],
      photoQuery: 'airport at night', photo: emptyPhoto(0.62),
      bonusPoints: '350', registrationRequired: false, period: '',
    },
    'community-goal': {
      scene: 'radar', title: 'April Community Goal', description: 'The whole community flies toward one shared counter.',
      countType: 'flights', target: '1200', progress: '',
      radar: { fir: 'URRV', sectors: true, traffic: 7, seed: 7, rings: true },
      bonusPoints: '350', registrationRequired: false, period: 'APRIL 2026',
    },
    slotted: {
      title: 'Peak Hour Ops', network: 'VATSIM', date: '', bookingUrl: 'https://vamsys.io/bookings/nws', showQr: true,
      legs: legsFrom('ULLI-UUEE'),
      waves: [
        { id: uid(), label: 'Wave 1', openTime: '17:00Z', condition: 'Auto-release 15 min prior' },
        { id: uid(), label: 'Wave 2', openTime: '18:30Z', condition: 'Open to all pilots' },
      ],
      visual: 'map', aircraft: { reg: '', type: '', model: '', va: '' }, photo: emptyPhoto(0.2), map: defaultMap(),
      bonusPoints: '350', registrationRequired: true, period: '',
    },
    event: {
      projects: ['nws', 'rag'],
      title: 'Northern Bridge Joint Event', description: 'One map, two projects, separate colored legs for each route.',
      period: '', partners: '',
      vnwsLegs: legsFrom('ULLI-UUEE\nUUEE-URSS'), ragLegs: legsFrom('UUDD-ULLI\nULLI-UUDD'),
      vnwsBonus: '350', ragBonus: '350', vnwsRegistration: false, ragRegistration: false, map: defaultMap(),
    },
    'vatsim-region': {
      kind: 'shuttle', title: 'Moscow – Saint Petersburg Shuttle', description: 'Full ATC coverage on both ends. Fly as many rotations as you can.',
      date: '', timeStart: '16:00', timeEnd: '20:00',
      divisions: ['VATRUS'], firs: ['UUWV', 'ULLL'], airports: ['UUEE', 'ULLI'], feeders: [],
      positions: 'UUEE_TWR, UUWV_CTR, ULLL_CTR, ULLI_APP', hosts: '', logos: [], projects: ['nws', 'rag'],
      vnwsLegs: legsFrom('ULLI-EDDM\nEDDM-LOWW'), ragLegs: legsFrom('UUEE-LKPR\nLKPR-UUDD'),
      bonusPoints: '500', registrationRequired: false, period: '', map: defaultMap(),
    },
  }
}

export const defaultState = (): StudioState => ({
  locale: 'ru',
  bannerLang: 'en',
  brand: 'nws',
  mode: 'focus-airport',
  data: defaultModeData(),
})
