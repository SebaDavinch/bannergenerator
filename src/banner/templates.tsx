import { useMemo } from 'react'
import { asset } from '../lib/asset'
import { ArrowLeftRight, CalendarDays, Clock, Gauge, Globe2, MapPin, Plane, Radio, Route as RouteIcon, Users } from 'lucide-react'
import { airportSync, cityName, greatCircleNm, useAirportDb } from '../data/airports'
import { useVatsimDb } from '../data/vatsim'
import { BANNER_COPY, MODES, countUnit } from '../i18n'
import { rng, hashString } from '../lib/rng'
import { RouteMap, type MapRoute, type MapShape, type MapStop } from '../map/RouteMap'
import { paletteFor } from '../map/themes'
import { networkBit, projectById, type Project } from '../data/projects'
import { fmtNum, toStop, useAirports, useLegRoute } from '../map/stops'
import type {
  ChallengeData, CollabData, FocusData, GoalData, Locale, MapView, ModeId, RosterData, SlottedData, TourData, VatsimData,
} from '../types'
import { TEAM_COLORS, brandTheme, type BrandTheme } from './brand'
import { AccentBar, BrandLogo, Guard, ModeBadge, Period, PhotoLayer, Reward, Ticks, Title } from './parts'
import { titleSize } from './layout'
import { RadarScene } from './RadarScene'
import { usePhotoUrl } from '../photos/image'
import { AIRLINER, GoalGauge, NetworkBackdrop, VersusArena } from './hero'
import { ApproachScene, BoardScene, CockpitScene, ContrailsScene, HoldingScene, RunwayScene, type BoardRow } from './scenes'

interface Ctx<T> {
  data: T
  patch?: (p: Partial<T>) => void
  brand: BrandTheme
  project: Project
  lang: Locale
  mode: ModeId
}

const modeLabel = (mode: ModeId, lang: Locale) => MODES.find((m) => m.id === mode)?.banner[lang] ?? mode

function Frame({ children, brand }: { children: React.ReactNode; brand: BrandTheme }) {
  return (
    <>
      {children}
      <AccentBar brand={brand} />
    </>
  )
}

function Footer({ ctx, points, registration, logos }: { ctx: Ctx<unknown>; points: string; registration: boolean; logos?: React.ReactNode }) {
  return (
    <>
      <Reward points={points} registration={registration} lang={ctx.lang} brand={ctx.brand} />
      <div className="b-logos">{logos ?? <BrandLogo project={ctx.project} />}</div>
    </>
  )
}

function MapLayer({ view, onView, routes, extra, shapes, accent, labelCity, fitShapes, project, lang, numbered }: {
  view: MapView; onView?: (v: Partial<MapView>) => void; routes: MapRoute[]; extra?: MapStop[]; shapes?: MapShape[]; accent: string; labelCity?: boolean; fitShapes?: boolean
  project: Project; lang: Locale; numbered?: boolean
}) {
  const palette = paletteFor(view.theme, project.colors)
  const light = palette.light
  return (
    <>
      <RouteMap view={view} onView={onView} routes={routes} extraStops={extra} shapes={shapes} accent={accent} labelCity={labelCity} fitShapes={fitShapes} palette={palette} lang={lang} numbered={numbered} />
      {view.frame === 'content' && view.guard > 0 && <Guard strength={light ? Math.min(1, view.guard + 0.1) : view.guard} light={light} />}
      {view.frame === 'full' && view.guard > 0 && <Guard strength={view.guard * 0.75} from="bottom" />}
    </>
  )
}

const patchMapOf = <T extends { map: MapView }>(ctx: Ctx<T>) =>
  ctx.patch ? (v: Partial<MapView>) => ctx.patch!({ map: { ...ctx.data.map, ...v } } as Partial<T>) : undefined

function LegChips({ legs, brand }: { legs: { from: string; to: string }[]; brand: BrandTheme }) {
  return (
    <div className="b-legs">
      {legs.filter((l) => l.from && l.to).slice(0, 8).map((l, i) => {
        const a = airportSync(l.from)
        const b = airportSync(l.to)
        return (
          <span className="b-leg" key={i}>
            {a && <span className={`fi fi-${a.country.toLowerCase()} b-flag`} />}
            {l.from}
            <span className="b-leg__arrow" style={{ color: brand.accentSoft }}>→</span>
            {b && <span className={`fi fi-${b.country.toLowerCase()} b-flag`} />}
            {l.to}
          </span>
        )
      })}
    </div>
  )
}

function Stats({ items }: { items: { icon: React.ReactNode; value: string; label: string }[] }) {
  return (
    <div className="b-stats">
      {items.map((s, i) => (
        <div className="b-stat" key={i}>
          <span className="b-stat__icon">{s.icon}</span>
          <span className="b-stat__value">{s.value}</span>
          <span className="b-stat__label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Focus Airport ──────────────────────────────────────────────────────────
export function FocusBanner(ctx: Ctx<FocusData>) {
  const { data, brand, lang } = ctx
  const a = data.airport
  const city = (data.cityOverride || cityName(a, lang)).trim()
  return (
    <Frame brand={brand}>
      <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />
      <div className="b-scrim b-scrim--focus" />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={city || '—'} size={titleSize(city, { max: 168, min: 88, width: 1150, lines: 1.6 })} />
        {data.tagline && <p className="b-tagline">{data.tagline}</p>}
        <AirportPlate airport={a} icaoBg={brand.gradient} />
      </div>
      <Period text={data.period} brand={brand} />
      <PhotoCaption photo={data.photo} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

/** Flag, name, ICAO/IATA and coordinates of a focus airport. */
function AirportPlate({ airport: a, icaoBg }: { airport: FocusData['airport']; icaoBg: string }) {
  if (!a) return null
  const coord = `${Math.abs(a.lat).toFixed(2)}°${a.lat >= 0 ? 'N' : 'S'}  ${Math.abs(a.lon).toFixed(2)}°${a.lon >= 0 ? 'E' : 'W'}`
  return (
    <>
      <div className="b-airport">
        <span className={`fi fi-${a.country.toLowerCase()} b-airport__flag`} />
        <span className="b-airport__name">{a.name}</span>
        <span className="b-airport__icao" style={{ background: icaoBg }}>{a.icao}</span>
        {a.iata && <span className="b-airport__iata">{a.iata}</span>}
      </div>
      <div className="b-coord"><MapPin size={22} /> {coord}</div>
    </>
  )
}

function PhotoCaption({ photo }: { photo: FocusData['photo'] }) {
  if (!photo.title || !(photo.src || photo.local?.startsWith('data:'))) return null
  return <div className="b-photo-caption">{photo.title}</div>
}

// ── Tour ───────────────────────────────────────────────────────────────────
function Itinerary({ legs, brand, lang }: { legs: TourData['legs']; brand: BrandTheme; lang: Locale }) {
  const db = useAirportDb()
  // Stops in visiting order, numbered like the map markers.
  const stops: { icao: string; nm: number | null }[] = []
  legs.filter((l) => l.from && l.to).forEach((l, i) => {
    if (i === 0) stops.push({ icao: l.from, nm: null })
    const a = db?.byIcao.get(l.from)
    const b = db?.byIcao.get(l.to)
    stops.push({ icao: l.to, nm: a && b ? Math.round(greatCircleNm(a, b)) : null })
  })
  const shown = stops.length > 8 ? [...stops.slice(0, 7), stops[stops.length - 1]] : stops
  return (
    <ol className="b-itinerary">
      {shown.map((s, i) => {
        const a = db?.byIcao.get(s.icao)
        // Same number as the map marker: first visit order, so a return to the start repeats its number.
        const order = [...new Set(stops.map((x) => x.icao))]
        const n = order.indexOf(s.icao) + 1
        return (
          <li key={`${s.icao}-${i}`} className="b-itinerary__stop">
            <span className="b-itinerary__n" style={{ background: brand.gradient }}>{n}</span>
            {a && <span className={`fi fi-${a.country.toLowerCase()} b-flag`} />}
            <b>{s.icao}</b>
            <i>{cityName(a, lang)}</i>
            {s.nm !== null && <span className="b-itinerary__nm">+{fmtNum(s.nm)} NM</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function TourBanner(ctx: Ctx<TourData>) {
  const { data, brand, lang } = ctx
  const c = BANNER_COPY[lang]
  const r = useLegRoute(data.legs, 'tour', brand.route, brand.routeGlow)
  const itinerary = data.layout === 'itinerary'
  return (
    <Frame brand={brand}>
      <MapLayer project={ctx.project} lang={lang} view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} numbered={itinerary} />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} width={900} size={titleSize(data.title, { max: itinerary ? 104 : 120, min: 64, width: 720, lines: 2.4 })} />
        <Ticks brand={brand} />
        {data.description && !itinerary && <p className="b-desc">{data.description}</p>}
        {itinerary ? <Itinerary legs={data.legs} brand={brand} lang={lang} /> : <LegChips legs={data.legs} brand={brand} />}
        <Stats items={[
          { icon: <RouteIcon size={24} />, value: String(r.legs), label: c.legs },
          { icon: <MapPin size={24} />, value: String(r.airports), label: c.airports },
          ...(r.countries > 1 ? [{ icon: <Globe2 size={24} />, value: String(r.countries), label: c.countries }] : []),
          { icon: <Gauge size={24} />, value: fmtNum(r.nm), label: c.nm },
        ]} />
      </div>
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Roster / Curated roster ────────────────────────────────────────────────
/** Stops as a line with nodes (metro-map style): ICAO and city under each node. */
function RouteLine({ stops, brand, lang }: { stops: string[]; brand: BrandTheme; lang: Locale }) {
  const db = useAirportDb()
  if (stops.length < 2) return null
  return (
    <div className="b-routeline" style={{ ['--n' as string]: stops.length }}>
      <span className="b-routeline__track" style={{ background: `linear-gradient(90deg, ${brand.accent}, ${brand.accentSoft})`, boxShadow: `0 0 18px ${brand.routeGlow}` }} />
      {stops.map((icao, i) => {
        const a = db?.byIcao.get(icao)
        return (
          <span className="b-routeline__stop" key={i}>
            <span className="b-routeline__node" style={{ borderColor: i === 0 || i === stops.length - 1 ? brand.accentSoft : '#fff' }} />
            <b>{icao}</b>
            <i>{cityName(a, lang)}</i>
          </span>
        )
      })}
    </div>
  )
}

function AircraftVisual({ ctx }: { ctx: Ctx<RosterData | SlottedData> }) {
  const { data, brand } = ctx
  const { url } = usePhotoUrl(data.photo)
  return (
    <>
      <div className="b-aircraft-bg" style={{ background: `radial-gradient(70% 90% at 78% 42%, ${brand.accent}26 0%, #0b111c 55%, #05070b 100%)` }} />
      {url
        ? <PhotoLayer className="b-photo--aircraft" photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } } as never) : undefined} />
        : <AircraftSilhouette brand={brand} />}
      <div className="b-aircraft-fade" />
      {(data.aircraft.model || data.aircraft.reg) && (
        <div className="b-aircraft-tag">
          <Plane size={26} color={brand.accentSoft} />
          <span className="b-aircraft-tag__model">{data.aircraft.model || data.aircraft.type}</span>
          {data.aircraft.reg && <span className="b-aircraft-tag__reg">{data.aircraft.reg}</span>}
          {data.aircraft.type && data.aircraft.model && <span className="b-aircraft-tag__type">{data.aircraft.type}</span>}
        </div>
      )}
    </>
  )
}

/** Stand-in until a photo is set: a large airliner in the project colours with contrails. */
function AircraftSilhouette({ brand }: { brand: BrandTheme }) {
  return (
    <svg className="scene" viewBox="0 0 1920 1080">
      <defs>
        <linearGradient id="ac-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brand.accentSoft} />
          <stop offset="1" stopColor={brand.accent} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="ac-trail" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="ac-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="30" /></filter>
      </defs>
      <g transform="translate(1340 500) rotate(42) scale(9.2) translate(-50 -50)">
        {[30.5, 69.5].map((x) => <rect key={x} x={x - 0.6} y={60} width={1.2} height={160} fill="url(#ac-trail)" />)}
        <path d={AIRLINER} fill={brand.accent} opacity={0.5} filter="url(#ac-glow)" />
        <path d={AIRLINER} fill="url(#ac-body)" stroke="rgba(255,255,255,.55)" strokeWidth={0.25} />
      </g>
    </svg>
  )
}

function Schedule({ legs, brand, lang }: { legs: RosterData['legs']; brand: BrandTheme; lang: Locale }) {
  const c = BANNER_COPY[lang]
  const db = useAirportDb()
  return (
    <div className="b-schedule">
      <div className="b-schedule__head">
        <span>#</span><span>{c.flight}</span><span>{c.from}</span><span /><span>{c.to}</span><span>NM</span>
      </div>
      {legs.filter((l) => l.from && l.to).slice(0, 6).map((l, i) => {
        const a = db?.byIcao.get(l.from)
        const b = db?.byIcao.get(l.to)
        return (
          <div className="b-schedule__row" key={l.id}>
            <span className="b-schedule__n" style={{ color: brand.accentSoft }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="b-schedule__flight">{l.note || `${brand.callsign}${(hashString(l.from + l.to + i) % 8000) + 1000}`}</span>
            <span className="b-schedule__ap">{a && <span className={`fi fi-${a.country.toLowerCase()} b-flag`} />}<b>{l.from}</b><i>{cityName(a, lang)}</i></span>
            <span className="b-schedule__arrow" style={{ color: brand.accentSoft }}>→</span>
            <span className="b-schedule__ap">{b && <span className={`fi fi-${b.country.toLowerCase()} b-flag`} />}<b>{l.to}</b><i>{cityName(b, lang)}</i></span>
            <span className="b-schedule__nm">{a && b ? fmtNum(Math.round(greatCircleNm(a, b))) : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

export function RosterBanner(ctx: Ctx<RosterData>) {
  const { data, brand, lang } = ctx
  const c = BANNER_COPY[lang]
  const curated = ctx.mode === 'curated-roster'
  const r = useLegRoute(data.legs, 'roster', brand.route, brand.routeGlow)
  const chain = useMemo(() => {
    const out: string[] = []
    data.legs.filter((l) => l.from && l.to).forEach((l, i) => { if (i === 0) out.push(l.from); out.push(l.to) })
    return out
  }, [data.legs])
  return (
    <Frame brand={brand}>
      {data.visual === 'map'
        ? <MapLayer project={ctx.project} lang={lang} view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} />
        : <AircraftVisual ctx={ctx} />}
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} width={900} size={titleSize(data.title, { max: 116, min: 68, width: 720, lines: 2.4 })} />
        <Ticks brand={brand} />
        {data.description && <p className="b-desc">{data.description}</p>}
        {curated ? (
          <Schedule legs={data.legs} brand={brand} lang={lang} />
        ) : (
          <>
            <RouteLine stops={chain.slice(0, 7)} brand={brand} lang={lang} />
            <Stats items={[
              { icon: <RouteIcon size={24} />, value: String(r.legs), label: c.legs },
              { icon: <Gauge size={24} />, value: fmtNum(r.nm), label: c.nm },
            ]} />
          </>
        )}
      </div>
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Community Challenge ───────────────────────────────────────────────────
function useBoardRows(seed: number, callsign: string, brandBit: number, lang: Locale): BoardRow[] {
  const db = useAirportDb()
  const c = BANNER_COPY[lang]
  const r = rng(seed)
  const pool = db ? db.list.filter((a) => a.network & brandBit && a.size !== 'S').slice(0, 300) : []
  return Array.from({ length: 11 }, (_, i) => {
    const a = pool.length ? pool[Math.floor(r() * pool.length)] : null
    const h = 6 + i
    return {
      time: `${String(h).padStart(2, '0')}:${String(Math.floor(r() * 12) * 5).padStart(2, '0')}`,
      flight: `${callsign}${Math.floor(100 + r() * 8900)}`,
      dest: (cityName(a, lang) || 'MOSCOW').toUpperCase().slice(0, 13),
      status: [c.stBoarding, c.stOnTime, `${c.stGate} 12`, c.stDeparted, c.stOnTime][Math.floor(r() * 5)],
    }
  })
}

export function ChallengeBanner(ctx: Ctx<ChallengeData>) {
  const { data, brand, lang, project } = ctx
  const teams = data.teams.slice(0, 4)
  const seed = hashString(data.title)
  const lanes = teams.map((_, i) => ({ color: TEAM_COLORS[i], label: ['09L', '09C', '09R', '27'][teams.length === 2 ? [0, 2][i] : i] ?? '' }))
  const tracks = teams.map((t, i) => ({ color: TEAM_COLORS[i], label: t.name.toUpperCase() }))
  const rows = useBoardRows(seed, brand.callsign, networkBit(project) || 3, lang)
  const teamRows: BoardRow[] = teams.map((t, i) => ({
    time: String(i + 1).padStart(2, '0') + ':00', flight: t.name.replace(/^team\s+/i, '').slice(0, 7), dest: `${fmtNum(t.target)} ${t.countType}`.toUpperCase().slice(0, 9),
    status: BANNER_COPY[lang].stRacing, color: TEAM_COLORS[i],
  }))
  return (
    <Frame brand={brand}>
      {data.scene === 'versus' && (
        <div className="b-arena-bg" style={{ background: `radial-gradient(60% 70% at 10% 95%, ${TEAM_COLORS[0]}40 0%, transparent 60%), radial-gradient(60% 70% at 92% 95%, ${TEAM_COLORS[1]}40 0%, transparent 60%), radial-gradient(80% 60% at 50% 0%, #1a2436 0%, #07090e 70%)` }} />
      )}
      {data.scene === 'photo' && <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />}
      {data.scene === 'runways' && <RunwayScene lanes={lanes} seed={seed} />}
      {data.scene === 'holding' && <HoldingScene tracks={tracks} seed={seed} lang={lang} />}
      {data.scene === 'board' && <BoardScene compact lang={lang} rows={[...teamRows, ...rows].slice(0, 13)} title={BANNER_COPY[lang].challengeBoard} />}
      {data.scene === 'contrails' && <ContrailsScene colors={TEAM_COLORS.slice(0, Math.max(2, teams.length))} seed={seed} count={teams.length * 3} />}
      {data.scene !== 'versus' && <div className="b-scrim b-scrim--challenge" />}
      {data.scene === 'versus' && <VersusArena teams={teams} lang={lang} brand={brand} />}
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} width={960} size={titleSize(data.title, { max: data.scene === 'versus' ? 96 : 112, min: 66, width: 900, lines: 2 })} />
        <Ticks brand={brand} />
        {data.description && data.scene !== 'versus' && <p className="b-desc">{data.description}</p>}
        {data.scene !== 'versus' && <div className={`b-teams b-teams--${teams.length}`}>
          {teams.map((t, i) => (
            <div className="b-team" key={t.id} style={{ ['--team' as string]: TEAM_COLORS[i] }}>
              {teams.length === 2 && i === 1 && <span className="b-team__vs">VS</span>}
              <span className="b-team__name">{t.name}</span>
              <span className="b-team__value">{fmtNum(t.target)}</span>
              <span className="b-team__unit">{countUnit(t.countType, lang)}</span>
            </div>
          ))}
        </div>}
      </div>
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Community Goal ────────────────────────────────────────────────────────
export function GoalBanner(ctx: Ctx<GoalData>) {
  const { data, brand, lang, project } = ctx
  const c = BANNER_COPY[lang]
  const target = Number(String(data.target).replace(/\s/g, '')) || 0
  const progress = Number(String(data.progress).replace(/\s/g, '')) || 0
  const pct = target > 0 && data.progress.trim() ? Math.min(100, (progress / target) * 100) : null
  const seed = data.radar.seed
  const fir = useVatsimDb()?.firById.get(data.radar.fir)
  const rows = useBoardRows(seed, brand.callsign, networkBit(project) || 3, lang)
  return (
    <Frame brand={brand}>
      {data.scene === 'gauge' && <NetworkBackdrop project={project} brand={brand} lang={lang} />}
      {data.scene === 'gauge' && <GoalGauge target={data.target} progress={data.progress} unit={countUnit(data.countType, lang)} brand={brand} lang={lang} />}
      {data.scene === 'radar' && <RadarScene fir={data.radar.fir} sectors={data.radar.sectors} traffic={data.radar.traffic} seed={seed} rings={data.radar.rings} accent={brand.accentSoft} callsign={brand.callsign} />}
      {data.scene === 'cockpit' && <CockpitScene seed={seed} accent={brand.accent} value={target} />}
      {data.scene === 'approach' && <ApproachScene icao={data.radar.fir.slice(0, 2) === 'UU' ? 'UUEE' : 'ULLI'} runway="ILS 06R" accent={brand.accentSoft} />}
      {data.scene === 'board' && <BoardScene lang={lang} rows={rows} big={fmtNum(target).replace(/\s/g, '')} title={BANNER_COPY[lang].goalBoard} />}
      {data.scene === 'contrails' && <ContrailsScene colors={[brand.accentSoft, brand.second, '#ffffff']} seed={seed} count={data.radar.traffic + 4} />}
      <div className={`b-scrim ${data.scene === 'gauge' ? 'b-scrim--gauge' : 'b-scrim--goal'}`} />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} width={820} size={titleSize(data.title, { max: 104, min: 64, width: 760, lines: 2 })} />
        <Ticks brand={brand} />
        {data.scene !== 'gauge' && <div className="b-goal">
          <span className="b-goal__value" style={{ color: brand.accentSoft, textShadow: `0 0 60px ${brand.routeGlow}` }}>{fmtNum(data.target)}</span>
          <span className="b-goal__unit">{countUnit(data.countType, lang)}</span>
          {pct !== null && (
            <div className="b-goal__progress">
              <div className="b-goal__bar"><span style={{ width: `${pct}%`, background: brand.gradient }} /></div>
              <span className="b-goal__pct">{c.progress} · {fmtNum(data.progress)} / {fmtNum(data.target)} · {Math.round(pct)}%</span>
            </div>
          )}
        </div>}
        {data.description && <p className={`b-desc ${data.scene === 'gauge' ? '' : 'b-desc--narrow'}`}>{data.description}</p>}
      </div>
      {data.scene === 'radar' && fir && <div className="b-scene-caption"><Radio size={20} /> {fir.id} · {fir.name}</div>}
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Slotted Event ─────────────────────────────────────────────────────────
/** Booking call-to-action as one quiet line under the reward. */
function SlotBooking({ url, brand, lang }: { url: string; brand: BrandTheme; lang: Locale }) {
  const c = BANNER_COPY[lang]
  const display = url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
  if (!display) return null
  return (
    <div className="b-booking">
      <span className="b-booking__dot" style={{ background: brand.accent, boxShadow: `0 0 12px ${brand.accent}` }} />
      <span className="b-booking__label">{c.bookSlot}</span>
      <span className="b-booking__url" style={{ color: brand.accentSoft }}>{display}</span>
    </div>
  )
}

export function SlottedBanner(ctx: Ctx<SlottedData>) {
  const { data, brand, lang } = ctx
  const r = useLegRoute(data.legs, 'slots', brand.route, brand.routeGlow)
  const vatsim = data.network.toUpperCase() === 'VATSIM'
  return (
    <Frame brand={brand}>
      {data.visual === 'map' && <MapLayer project={ctx.project} lang={lang} view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} labelCity />}
      {data.visual === 'aircraft' && <AircraftVisual ctx={ctx as Ctx<SlottedData>} />}
      {data.visual === 'photo' && (
        <>
          <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />
          <div className="b-scrim b-scrim--focus" />
        </>
      )}
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} extra={data.network && !vatsim ? <span className="b-badge b-badge--ghost">{data.network}</span> : undefined} />
        <Title text={data.title} width={900} size={titleSize(data.title, { max: 116, min: 68, width: 760, lines: 2.2 })} />
        {data.date && <div className="b-date"><CalendarDays size={26} color={brand.accentSoft} /> {data.date}</div>}
        <LegChips legs={data.legs} brand={brand} />
        <div className="b-waves">
          {data.waves.slice(0, 4).map((w, i) => (
            <div className="b-wave" key={w.id}>
              <span className="b-wave__node" style={{ borderColor: brand.accentSoft, background: i === 0 ? brand.accent : 'transparent' }} />
              <span className="b-wave__time">{w.openTime || '—'}</span>
              <span className="b-wave__label">{w.label}</span>
              {w.condition && <span className="b-wave__cond">{w.condition}</span>}
            </div>
          ))}
        </div>
      </div>
      <Period text={data.period} brand={brand} />
      <div className="b-slot-footer">
        <Reward points={data.bonusPoints} registration={data.registrationRequired} lang={lang} brand={brand} style={{ position: 'static' }} />
        <SlotBooking url={data.bookingUrl} brand={brand} lang={lang} />
      </div>
      <div className="b-logos">
        {vatsim && <img className="b-netlogo" src={asset('brand/vatsim-logo.png')} alt="VATSIM" />}
        <BrandLogo project={ctx.project} />
      </div>
    </Frame>
  )
}

// ── Collab Event ──────────────────────────────────────────────────────────
export function CollabBanner(ctx: Ctx<CollabData>) {
  const { data, lang } = ctx
  const nws = brandTheme(projectById(data.projects?.[0] ?? 'nws'))
  const rag = brandTheme(projectById(data.projects?.[1] ?? 'rag'))
  const c = BANNER_COPY[lang]
  const a = useLegRoute(data.vnwsLegs, 'nws', nws.route, nws.routeGlow)
  const b = useLegRoute(data.ragLegs, 'rag', rag.route, rag.routeGlow)
  const brand = ctx.brand
  const pair = `linear-gradient(90deg, ${nws.accent}, ${rag.accent})`
  const focus = data.layout === 'focus'
  const city = (data.cityOverride || cityName(data.airport, lang)).trim()
  const tagline = data.tagline || data.title
  return (
    <Frame brand={{ ...brand, gradient: `linear-gradient(180deg, ${nws.accent} 0%, ${nws.accent} 50%, ${rag.accent} 50%, ${rag.accent} 100%)` }}>
      {focus ? (
        <>
          <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />
          <div className="b-scrim b-scrim--focus" />
        </>
      ) : (
        <MapLayer project={ctx.project} lang={lang} view={data.map} onView={patchMapOf(ctx)} routes={[a.route, b.route]} accent={brand.accent} />
      )}
      <div className="b-content">
        <div className="b-badge-row">
          <span className="b-badge" style={{ background: pair }}>{focus ? `${c.joint} · ${modeLabel('focus-airport', lang)}` : c.joint}</span>
          <span className="b-badge-rule" />
        </div>
        {focus ? (
          <>
            <Title text={city || '—'} size={titleSize(city, { max: 168, min: 88, width: 1150, lines: 1.6 })} />
            {tagline && <p className="b-tagline">{tagline}</p>}
            <AirportPlate airport={data.airport} icaoBg={pair} />
          </>
        ) : (
          <>
            <Title text={data.title} width={900} size={titleSize(data.title, { max: 112, min: 66, width: 760, lines: 2.4 })} />
            {data.description && <p className="b-desc">{data.description}</p>}
            <div className="b-collab-routes">
              <div className="b-collab-route" style={{ ['--c' as string]: nws.route }}><b>{nws.short}</b><LegChips legs={data.vnwsLegs} brand={nws} /></div>
              <div className="b-collab-route" style={{ ['--c' as string]: rag.route }}><b>{rag.short}</b><LegChips legs={data.ragLegs} brand={rag} /></div>
            </div>
          </>
        )}
        {data.partners && <div className="b-partners"><Users size={22} /> {data.partners}</div>}
      </div>
      <Period text={data.period} brand={brand} />
      {focus && <PhotoCaption photo={data.photo} />}
      {data.pointsMode === 'merged' ? (
        <Reward points={data.bonus} registration={data.registration} lang={lang} brand={nws} label={`${c.reward} · ${nws.short} × ${rag.short}`} />
      ) : (
        <div className="b-collab-rewards">
          {[{ b: nws, pts: data.vnwsBonus, reg: data.vnwsRegistration, label: nws.short }, { b: rag, pts: data.ragBonus, reg: data.ragRegistration, label: rag.short }].map((x) => (
            <div className="b-collab-reward" key={x.label}>
              <span className="b-collab-reward__who" style={{ background: x.b.gradient }}>{x.label}</span>
              <span className="b-collab-reward__pts"><b style={{ color: x.b.accentSoft }}>+{x.pts || 0}</b> {c.bonus}</span>
              {x.reg && <span className="b-collab-reward__reg">{c.registration}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="b-logos b-logos--pair">
        <BrandLogo project={nws.project} style={{ height: Math.min(62, nws.project.logoHeight) }} />
        <span className="b-logos__x">×</span>
        <BrandLogo project={rag.project} style={{ height: Math.min(56, rag.project.logoHeight) }} />
      </div>
    </Frame>
  )
}

// ── VATSIM Event ──────────────────────────────────────────────────────────
export function VatsimBanner(ctx: Ctx<VatsimData> & { logos: { id: string; src: string; name: string }[] }) {
  const { data, brand, lang } = ctx
  const c = BANNER_COPY[lang]
  const vatsim = useVatsimDb()
  const db = useAirportDb()
  const focus = useAirports(data.airports)
  const feeders = useAirports(data.feeders)
  const pa = brandTheme(projectById(data.projects?.[0] ?? 'nws'))
  const pb = brandTheme(projectById(data.projects?.[1] ?? 'rag'))
  const nwsRoute = useLegRoute(data.vnwsLegs, 'pa', pa.route, pa.routeGlow)
  const ragRoute = useLegRoute(data.ragLegs, 'pb', pb.route, pb.routeGlow)

  const shapes: MapShape[] = useMemo(() => {
    if (!vatsim) return []
    return data.firs.map((id) => vatsim.shapes.get(id)).filter(Boolean).map((f) => ({ id: String(f!.id), feature: f!, color: '#38bdf8' }))
  }, [vatsim, data.firs])

  const { routes, extra } = useMemo(() => {
    const extraStops: MapStop[] = []
    let rs: MapRoute[] = []
    if (data.kind === 'shuttle' && focus.length >= 2) {
      const [a, b] = focus
      rs = [{ id: 'shuttle', stops: [], color: brand.route, glow: brand.routeGlow, width: 5, pairs: [[toStop(a), toStop(b)], [toStop(b), toStop(a)]] }]
    } else if (data.kind === 'overload') {
      const target = focus[0]
      let origins = feeders
      if (target && !origins.length && db) {
        // No feeders given: pick VA network airports 300–1600 nm out, spread by bearing.
        const r = rng(hashString(target.icao))
        origins = db.list
          .filter((x) => x.network && x.icao !== target.icao && x.size !== 'S')
          .map((x) => ({ x, d: greatCircleNm(x, target) }))
          .filter((o) => o.d > 300 && o.d < 1600)
          .sort(() => r() - 0.5)
          .slice(0, 9)
          .map((o) => o.x)
      }
      if (target) {
        rs = [{ id: 'overload', stops: [], color: brand.route, glow: brand.routeGlow, width: 3, pairs: origins.map((o) => [toStop(o, 'feeder'), toStop(target, 'focus')] as [MapStop, MapStop]) }]
        focus.forEach((f) => extraStops.push({ ...toStop(f, 'focus'), color: brand.accent }))
      }
    } else if (data.kind === 'online-day') {
      focus.forEach((f) => extraStops.push({ ...toStop(f, 'focus'), color: '#38bdf8' }))
    } else {
      rs = [nwsRoute.route, ragRoute.route]
    }
    return { routes: rs, extra: extraStops }
  }, [data.kind, focus, feeders, db, brand, nwsRoute.route, ragRoute.route])

  const kindLabel = { shuttle: c.shuttle, 'online-day': c.onlineDay, overload: c.overload, 'cross-region': c.crossRegion }[data.kind]
  const positions = data.positions.split(/[,;\s]+/).map((p) => p.trim().toUpperCase()).filter(Boolean).slice(0, 8)
  const time = [data.timeStart, data.timeEnd].filter(Boolean).join(' – ')
  const chosenLogos = ctx.logos.filter((l) => data.logos.includes(l.id))

  return (
    <Frame brand={brand}>
      <MapLayer project={ctx.project} lang={lang} view={data.map} onView={patchMapOf(ctx)} routes={routes} extra={extra} shapes={shapes} accent={brand.accent} labelCity={data.kind !== 'cross-region'} fitShapes={data.kind === 'online-day'} />
      <div className="b-content">
        <ModeBadge label={`VATSIM · ${kindLabel}`} brand={brand} />
        {data.kind === 'shuttle' && focus.length >= 2 ? (
          <div className="b-shuttle">
            <div className="b-shuttle__ap"><span className="b-shuttle__icao">{focus[0].icao}</span><span className="b-shuttle__city">{cityName(focus[0], lang)}</span></div>
            <ArrowLeftRight size={84} color={brand.accentSoft} strokeWidth={2.2} />
            <div className="b-shuttle__ap"><span className="b-shuttle__icao">{focus[1].icao}</span><span className="b-shuttle__city">{cityName(focus[1], lang)}</span></div>
          </div>
        ) : null}
        <Title text={data.title} width={900} size={titleSize(data.title, { max: data.kind === 'shuttle' ? 72 : 112, min: 56, width: 780, lines: 2.2 })} />
        {data.kind === 'overload' && focus[0] && <div className="b-date"><Plane size={26} color={brand.accentSoft} /> {c.converge} {focus.map((f) => f.icao).join(' · ')}</div>}
        {data.kind === 'online-day' && data.firs.length > 0 && (
          <div className="b-firs">
            <span className="b-firs__label">{c.fullCoverage}</span>
            {data.firs.slice(0, 5).map((id) => <span className="b-fir" key={id}>{id}<i>{vatsim?.firById.get(id)?.name}</i></span>)}
          </div>
        )}
        {data.kind === 'cross-region' && (
          <div className="b-firs">
            {data.divisions.map((d) => <span className="b-fir b-fir--div" key={d}>{d}</span>)}
          </div>
        )}
        {data.description && <p className="b-desc">{data.description}</p>}
        <div className="b-event-meta">
          {data.date && <span><CalendarDays size={24} /> {data.date}</span>}
          {time && <span><Clock size={24} /> {time} {c.zulu}</span>}
        </div>
        {positions.length > 0 && (
          <div className="b-positions">
            <span className="b-positions__label"><Radio size={20} /> {c.positions}</span>
            {positions.map((p) => <span className="b-position" key={p}>{p}</span>)}
          </div>
        )}
      </div>
      <Period text={data.period} brand={brand} />
      <Reward points={data.bonusPoints} registration={data.registrationRequired} lang={lang} brand={brand} />
      <div className="b-logos">
        {(chosenLogos.length > 0 || data.hosts) && (
          <div className="b-hosts">
            <span className="b-hosts__label">{c.hosts}</span>
            {chosenLogos.map((l) => <img key={l.id} src={l.src} alt={l.name} />)}
            {data.hosts && <span className="b-hosts__text">{data.hosts}</span>}
          </div>
        )}
        <img className="b-netlogo" src={asset('brand/vatsim-logo.png')} alt="VATSIM" />
        <BrandLogo project={ctx.project} />
      </div>
    </Frame>
  )
}
