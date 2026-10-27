import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeftRight, CalendarDays, Clock, Gauge, MapPin, Plane, Radio, Route as RouteIcon, Users } from 'lucide-react'
import { airportSync, greatCircleNm, useAirportDb } from '../data/airports'
import { useVatsimDb } from '../data/vatsim'
import { BANNER_COPY, MODES, countUnit } from '../i18n'
import { rng, hashString } from '../lib/rng'
import { RouteMap, type MapRoute, type MapShape, type MapStop } from '../map/RouteMap'
import { MAP_THEMES } from '../map/themes'
import { fmtNum, toStop, useAirports, useLegRoute } from '../map/stops'
import type {
  Brand, ChallengeData, CollabData, FocusData, GoalData, Locale, MapView, ModeId, RosterData, SlottedData, TourData, VatsimData,
} from '../types'
import { BRANDS, TEAM_COLORS, type BrandTheme } from './brand'
import { AccentBar, BrandLogo, Guard, ModeBadge, Period, PhotoLayer, Reward, Ticks, Title } from './parts'
import { titleSize } from './layout'
import { RadarScene } from './RadarScene'
import { ApproachScene, BoardScene, CockpitScene, ContrailsScene, HoldingScene, RunwayScene, type BoardRow } from './scenes'

interface Ctx<T> {
  data: T
  patch?: (p: Partial<T>) => void
  brand: BrandTheme
  brandId: Brand
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
      <div className="b-logos">{logos ?? <BrandLogo brand={ctx.brandId} />}</div>
    </>
  )
}

function MapLayer({ view, onView, routes, extra, shapes, accent, labelCity, fitShapes }: {
  view: MapView; onView?: (v: Partial<MapView>) => void; routes: MapRoute[]; extra?: MapStop[]; shapes?: MapShape[]; accent: string; labelCity?: boolean; fitShapes?: boolean
}) {
  const light = MAP_THEMES[view.theme]?.light
  return (
    <>
      <RouteMap view={view} onView={onView} routes={routes} extraStops={extra} shapes={shapes} accent={accent} labelCity={labelCity} fitShapes={fitShapes} />
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
  const city = (data.cityOverride || a?.city || '').trim()
  const coord = a ? `${Math.abs(a.lat).toFixed(2)}°${a.lat >= 0 ? 'N' : 'S'}  ${Math.abs(a.lon).toFixed(2)}°${a.lon >= 0 ? 'E' : 'W'}` : ''
  return (
    <Frame brand={brand}>
      <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />
      <div className="b-scrim b-scrim--focus" />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={city || '—'} size={titleSize(city, { max: 168, min: 88, width: 1150, lines: 1.6 })} />
        {data.tagline && <p className="b-tagline">{data.tagline}</p>}
        {a && (
          <div className="b-airport">
            <span className={`fi fi-${a.country.toLowerCase()} b-airport__flag`} />
            <span className="b-airport__name">{a.name}</span>
            <span className="b-airport__icao" style={{ background: brand.gradient }}>{a.icao}</span>
            {a.iata && <span className="b-airport__iata">{a.iata}</span>}
          </div>
        )}
        {coord && <div className="b-coord"><MapPin size={22} /> {coord}</div>}
      </div>
      <Period text={data.period} brand={brand} />
      {data.photo.title && (data.photo.src || data.photo.local?.startsWith('data:')) && (
        <div className="b-photo-caption">{data.photo.title}</div>
      )}
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Tour ───────────────────────────────────────────────────────────────────
export function TourBanner(ctx: Ctx<TourData>) {
  const { data, brand, lang } = ctx
  const c = BANNER_COPY[lang]
  const r = useLegRoute(data.legs, 'tour', brand.route, brand.routeGlow)
  return (
    <Frame brand={brand}>
      <MapLayer view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} size={titleSize(data.title, { max: 120, min: 70, width: 720, lines: 2.4 })} />
        <Ticks brand={brand} />
        {data.description && <p className="b-desc">{data.description}</p>}
        <LegChips legs={data.legs} brand={brand} />
        <Stats items={[
          { icon: <RouteIcon size={24} />, value: String(r.legs), label: c.legs },
          { icon: <MapPin size={24} />, value: String(r.airports), label: c.airports },
          { icon: <Gauge size={24} />, value: fmtNum(r.nm), label: c.nm },
        ]} />
      </div>
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Roster / Curated roster ────────────────────────────────────────────────
function AircraftVisual({ ctx }: { ctx: Ctx<RosterData | SlottedData> }) {
  const { data, brand } = ctx
  return (
    <>
      <div className="b-aircraft-bg" />
      <PhotoLayer className="b-photo--aircraft" photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } } as never) : undefined} />
      <div className="b-aircraft-fade" />
      <div className="b-aircraft-slash" style={{ background: brand.gradient }} />
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
            <span className="b-schedule__ap">{a && <span className={`fi fi-${a.country.toLowerCase()} b-flag`} />}<b>{l.from}</b><i>{a?.city}</i></span>
            <span className="b-schedule__arrow" style={{ color: brand.accentSoft }}>→</span>
            <span className="b-schedule__ap">{b && <span className={`fi fi-${b.country.toLowerCase()} b-flag`} />}<b>{l.to}</b><i>{b?.city}</i></span>
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
        ? <MapLayer view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} />
        : <AircraftVisual ctx={ctx} />}
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} size={titleSize(data.title, { max: 116, min: 68, width: 720, lines: 2.4 })} />
        <Ticks brand={brand} />
        {data.description && <p className="b-desc">{data.description}</p>}
        {curated ? (
          <Schedule legs={data.legs} brand={brand} lang={lang} />
        ) : (
          <>
            <div className="b-chain">
              {chain.slice(0, 7).map((icao, i) => {
                const a = airportSync(icao)
                return (
                  <span className="b-chain__item" key={i}>
                    {i > 0 && <span className="b-chain__line" style={{ background: brand.gradient }} />}
                    <span className="b-chain__stop">
                      {a && <span className={`fi fi-${a.country.toLowerCase()} b-flag`} />}
                      {icao}
                    </span>
                  </span>
                )
              })}
            </div>
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
function useBoardRows(seed: number, callsign: string, brandBit: number): BoardRow[] {
  const db = useAirportDb()
  const r = rng(seed)
  const pool = db ? db.list.filter((a) => a.network & brandBit && a.size !== 'S').slice(0, 300) : []
  return Array.from({ length: 11 }, (_, i) => {
    const a = pool.length ? pool[Math.floor(r() * pool.length)] : null
    const h = 6 + i
    return {
      time: `${String(h).padStart(2, '0')}:${String(Math.floor(r() * 12) * 5).padStart(2, '0')}`,
      flight: `${callsign}${Math.floor(100 + r() * 8900)}`,
      dest: (a?.city || 'MOSCOW').toUpperCase().slice(0, 13),
      status: ['BOARDING', 'ON TIME', 'GATE 12', 'DEPARTED', 'ON TIME'][Math.floor(r() * 5)],
    }
  })
}

export function ChallengeBanner(ctx: Ctx<ChallengeData>) {
  const { data, brand, lang, brandId } = ctx
  const teams = data.teams.slice(0, 4)
  const seed = hashString(data.title)
  const lanes = teams.map((_, i) => ({ color: TEAM_COLORS[i], label: ['09L', '09C', '09R', '27'][teams.length === 2 ? [0, 2][i] : i] ?? '' }))
  const tracks = teams.map((t, i) => ({ color: TEAM_COLORS[i], label: t.name.toUpperCase() }))
  const rows = useBoardRows(seed, brand.callsign, brandId === 'rag' ? 2 : 1)
  const teamRows: BoardRow[] = teams.map((t, i) => ({
    time: String(i + 1).padStart(2, '0') + ':00', flight: t.name.replace(/^team\s+/i, '').slice(0, 7), dest: `${fmtNum(t.target)} ${t.countType}`.toUpperCase().slice(0, 9),
    status: 'RACING', color: TEAM_COLORS[i],
  }))
  return (
    <Frame brand={brand}>
      {data.scene === 'photo' && <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />}
      {data.scene === 'runways' && <RunwayScene lanes={lanes} seed={seed} />}
      {data.scene === 'holding' && <HoldingScene tracks={tracks} seed={seed} />}
      {data.scene === 'board' && <BoardScene compact rows={[...teamRows, ...rows].slice(0, 13)} title="CHALLENGE BOARD" />}
      {data.scene === 'contrails' && <ContrailsScene colors={TEAM_COLORS.slice(0, Math.max(2, teams.length))} seed={seed} count={teams.length * 3} />}
      <div className="b-scrim b-scrim--challenge" />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} size={titleSize(data.title, { max: 112, min: 66, width: 900, lines: 2 })} />
        <Ticks brand={brand} />
        {data.description && <p className="b-desc">{data.description}</p>}
        <div className={`b-teams b-teams--${teams.length}`}>
          {teams.map((t, i) => (
            <div className="b-team" key={t.id} style={{ ['--team' as string]: TEAM_COLORS[i] }}>
              {teams.length === 2 && i === 1 && <span className="b-team__vs">VS</span>}
              <span className="b-team__name">{t.name}</span>
              <span className="b-team__value">{fmtNum(t.target)}</span>
              <span className="b-team__unit">{countUnit(t.countType, lang)}</span>
            </div>
          ))}
        </div>
      </div>
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Community Goal ────────────────────────────────────────────────────────
export function GoalBanner(ctx: Ctx<GoalData>) {
  const { data, brand, lang, brandId } = ctx
  const c = BANNER_COPY[lang]
  const target = Number(String(data.target).replace(/\s/g, '')) || 0
  const progress = Number(String(data.progress).replace(/\s/g, '')) || 0
  const pct = target > 0 && data.progress.trim() ? Math.min(100, (progress / target) * 100) : null
  const seed = data.radar.seed
  const fir = useVatsimDb()?.firById.get(data.radar.fir)
  const rows = useBoardRows(seed, brand.callsign, brandId === 'rag' ? 2 : 1)
  return (
    <Frame brand={brand}>
      {data.scene === 'radar' && <RadarScene fir={data.radar.fir} sectors={data.radar.sectors} traffic={data.radar.traffic} seed={seed} rings={data.radar.rings} accent={brand.accentSoft} callsign={brand.callsign} />}
      {data.scene === 'cockpit' && <CockpitScene seed={seed} accent={brand.accent} value={target} />}
      {data.scene === 'approach' && <ApproachScene icao={data.radar.fir.slice(0, 2) === 'UU' ? 'UUEE' : 'ULLI'} runway="ILS 06R" accent={brand.accentSoft} />}
      {data.scene === 'board' && <BoardScene rows={rows} big={fmtNum(target).replace(/\s/g, '')} title="COMMUNITY GOAL" />}
      {data.scene === 'contrails' && <ContrailsScene colors={[brand.accentSoft, brand.second, '#ffffff']} seed={seed} count={data.radar.traffic + 4} />}
      <div className="b-scrim b-scrim--goal" />
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} />
        <Title text={data.title} size={titleSize(data.title, { max: 104, min: 64, width: 760, lines: 2 })} />
        <Ticks brand={brand} />
        <div className="b-goal">
          <span className="b-goal__value" style={{ color: brand.accentSoft, textShadow: `0 0 60px ${brand.routeGlow}` }}>{fmtNum(data.target)}</span>
          <span className="b-goal__unit">{countUnit(data.countType, lang)}</span>
          {pct !== null && (
            <div className="b-goal__progress">
              <div className="b-goal__bar"><span style={{ width: `${pct}%`, background: brand.gradient }} /></div>
              <span className="b-goal__pct">{c.progress} · {fmtNum(data.progress)} / {fmtNum(data.target)} · {Math.round(pct)}%</span>
            </div>
          )}
        </div>
        {data.description && <p className="b-desc b-desc--narrow">{data.description}</p>}
      </div>
      {data.scene === 'radar' && fir && <div className="b-scene-caption"><Radio size={20} /> {fir.id} · {fir.name}</div>}
      <Period text={data.period} brand={brand} />
      <Footer ctx={ctx} points={data.bonusPoints} registration={data.registrationRequired} />
    </Frame>
  )
}

// ── Slotted Event ─────────────────────────────────────────────────────────
function useQr(text: string, color: string) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    if (!text) return
    QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: color, light: '#00000000' } })
      .then(setSvg)
      .catch(() => setSvg(''))
  }, [text, color])
  return text ? svg : ''
}

function SlotTicket({ data, brand, lang }: { data: SlottedData; brand: BrandTheme; lang: Locale }) {
  const c = BANNER_COPY[lang]
  const url = data.bookingUrl.trim()
  const qr = useQr(data.showQr ? url : '', '#0b0f17')
  if (!url) return null
  const display = url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return (
    <div className="b-ticket">
      <div className="b-ticket__main">
        <div className="b-ticket__eyebrow" style={{ color: brand.accentSoft }}><span className="b-ticket__dot" style={{ background: brand.accent, boxShadow: `0 0 14px ${brand.accent}` }} />{c.slotsOpen}</div>
        <div className="b-ticket__title">{c.bookSlot}</div>
        <div className="b-ticket__url">{display}</div>
      </div>
      <div className="b-ticket__perf" />
      {qr ? (
        <div className="b-ticket__stub">
          <div className="b-ticket__qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <span>{c.scan}</span>
        </div>
      ) : (
        <div className="b-ticket__stub b-ticket__stub--plain" style={{ background: brand.gradient }}><Plane size={44} color="#fff" /></div>
      )}
    </div>
  )
}

export function SlottedBanner(ctx: Ctx<SlottedData>) {
  const { data, brand, lang } = ctx
  const r = useLegRoute(data.legs, 'slots', brand.route, brand.routeGlow)
  const vatsim = data.network.toUpperCase() === 'VATSIM'
  return (
    <Frame brand={brand}>
      {data.visual === 'map' && <MapLayer view={data.map} onView={patchMapOf(ctx)} routes={[r.route]} accent={brand.accent} labelCity />}
      {data.visual === 'aircraft' && <AircraftVisual ctx={ctx as Ctx<SlottedData>} />}
      {data.visual === 'photo' && (
        <>
          <PhotoLayer photo={data.photo} onChange={ctx.patch ? (p) => ctx.patch!({ photo: { ...data.photo, ...p } }) : undefined} />
          <div className="b-scrim b-scrim--focus" />
        </>
      )}
      <div className="b-content">
        <ModeBadge label={modeLabel(ctx.mode, lang)} brand={brand} extra={data.network && !vatsim ? <span className="b-badge b-badge--ghost">{data.network}</span> : undefined} />
        <Title text={data.title} size={titleSize(data.title, { max: 116, min: 68, width: 760, lines: 2.2 })} />
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
      </div>
      <SlotTicket data={data} brand={brand} lang={lang} />
      <div className="b-logos">
        {vatsim && <img className="b-netlogo" src="/brand/vatsim-logo.png" alt="VATSIM" />}
        <BrandLogo brand={ctx.brandId} />
      </div>
    </Frame>
  )
}

// ── Collab Event ──────────────────────────────────────────────────────────
export function CollabBanner(ctx: Ctx<CollabData>) {
  const { data, lang } = ctx
  const nws = BRANDS.nws
  const rag = BRANDS.rag
  const c = BANNER_COPY[lang]
  const a = useLegRoute(data.vnwsLegs, 'nws', nws.route, nws.routeGlow)
  const b = useLegRoute(data.ragLegs, 'rag', rag.route, rag.routeGlow)
  const brand = ctx.brand
  return (
    <Frame brand={{ ...brand, gradient: `linear-gradient(180deg, ${nws.accent} 0%, ${nws.accent} 50%, ${rag.accent} 50%, ${rag.accent} 100%)` }}>
      <MapLayer view={data.map} onView={patchMapOf(ctx)} routes={[a.route, b.route]} accent={brand.accent} />
      <div className="b-content">
        <div className="b-badge-row">
          <span className="b-badge" style={{ background: `linear-gradient(90deg, ${nws.accent}, ${rag.accent})` }}>{c.joint}</span>
          <span className="b-badge-rule" />
        </div>
        <Title text={data.title} size={titleSize(data.title, { max: 112, min: 66, width: 760, lines: 2.4 })} />
        {data.description && <p className="b-desc">{data.description}</p>}
        <div className="b-collab-routes">
          <div className="b-collab-route" style={{ ['--c' as string]: nws.route }}><b>vNWS</b><LegChips legs={data.vnwsLegs} brand={nws} /></div>
          <div className="b-collab-route" style={{ ['--c' as string]: rag.route }}><b>RAG</b><LegChips legs={data.ragLegs} brand={rag} /></div>
        </div>
        {data.partners && <div className="b-partners"><Users size={22} /> {data.partners}</div>}
      </div>
      <Period text={data.period} brand={brand} />
      <div className="b-collab-rewards">
        {[{ b: nws, pts: data.vnwsBonus, reg: data.vnwsRegistration, label: 'vNWS' }, { b: rag, pts: data.ragBonus, reg: data.ragRegistration, label: 'RAG' }].map((x) => (
          <div className="b-collab-reward" key={x.label}>
            <span className="b-collab-reward__who" style={{ background: x.b.gradient }}>{x.label}</span>
            <span className="b-collab-reward__pts"><b style={{ color: x.b.accentSoft }}>+{x.pts || 0}</b> {c.bonus}</span>
            {x.reg && <span className="b-collab-reward__reg">{c.registration}</span>}
          </div>
        ))}
      </div>
      <div className="b-logos b-logos--pair">
        <BrandLogo brand="nws" style={{ height: 62 }} />
        <span className="b-logos__x">×</span>
        <BrandLogo brand="rag" style={{ height: 54 }} />
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
  const nwsRoute = useLegRoute(data.vnwsLegs, 'nws', BRANDS.nws.route, BRANDS.nws.routeGlow)
  const ragRoute = useLegRoute(data.ragLegs, 'rag', BRANDS.rag.route, BRANDS.rag.routeGlow)

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
      <MapLayer view={data.map} onView={patchMapOf(ctx)} routes={routes} extra={extra} shapes={shapes} accent={brand.accent} labelCity={data.kind !== 'cross-region'} fitShapes={data.kind === 'online-day'} />
      <div className="b-content">
        <ModeBadge label={`VATSIM · ${kindLabel}`} brand={brand} />
        {data.kind === 'shuttle' && focus.length >= 2 ? (
          <div className="b-shuttle">
            <div className="b-shuttle__ap"><span className="b-shuttle__icao">{focus[0].icao}</span><span className="b-shuttle__city">{focus[0].city}</span></div>
            <ArrowLeftRight size={84} color={brand.accentSoft} strokeWidth={2.2} />
            <div className="b-shuttle__ap"><span className="b-shuttle__icao">{focus[1].icao}</span><span className="b-shuttle__city">{focus[1].city}</span></div>
          </div>
        ) : null}
        <Title text={data.title} size={titleSize(data.title, { max: data.kind === 'shuttle' ? 72 : 112, min: 56, width: 780, lines: 2.2 })} />
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
        <img className="b-netlogo" src="/brand/vatsim-logo.png" alt="VATSIM" />
        <BrandLogo brand={ctx.brandId} />
      </div>
    </Frame>
  )
}
