import { useMemo } from 'react'
import { greatCircleNm, useAirportDb, type AirportRecord } from '../data/airports'
import { networkBit, type Project } from '../data/projects'
import { BANNER_COPY, countUnit } from '../i18n'
import { defaultMap } from '../state/defaults'
import type { Locale, Team } from '../types'
import { RouteMap, type MapStop } from '../map/RouteMap'
import { paletteFor } from '../map/themes'
import { toStop } from '../map/stops'
import { fmtNum } from '../map/stops'
import type { BrandTheme } from './brand'
import { TEAM_COLORS } from './brand'

/** Top-down airliner silhouette, nose up, in a 100×100 box. */
export const AIRLINER =
  'M50 3C53 3 54.5 8 54.5 14L54.5 40L94 58L94 62L54.5 54L54.5 82L68 92L68 95L54 92L52 97L48 97L46 92L32 95L32 92L45.5 82L45.5 54L6 62L6 58L45.5 40L45.5 14C45.5 8 47 3 50 3Z'

const num = (s: string) => Number(String(s).replace(/\s/g, '')) || 0

/**
 * The project's own network at night: shaded relief with routes from the
 * main hub to the project's airports (vAMSYS catalog), no labels — a quiet
 * backdrop that still says "this is our network".
 */
export function NetworkBackdrop({ project, brand, lang }: { project: Project; brand: BrandTheme; lang: Locale }) {
  const db = useAirportDb()
  const route = useMemo(() => {
    if (!db) return null
    const bit = networkBit(project) || 1
    const own = db.list.filter((a) => a.network & bit && a.size !== 'S')
    // Hub = medoid of the project's large airports in its home country (the most common one),
    // so a network with many holiday routes still radiates from its real base.
    const counts = new Map<string, number>()
    for (const a of own) counts.set(a.country, (counts.get(a.country) ?? 0) + 1)
    const home = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]
    const base = own.filter((a) => a.size === 'L' && a.country === home)
    const pool = base.length ? base : own
    let hub: AirportRecord | undefined
    let best = Infinity
    for (const a of pool) {
      const cost = pool.reduce((sum, b) => sum + greatCircleNm(a, b), 0)
      if (cost < best) { best = cost; hub = a }
    }
    hub ??= db.byIcao.get('UUEE')
    if (!hub) return null
    // Nearest network airports first, thinned so lines fan out instead of bunching.
    const picked: AirportRecord[] = []
    for (const a of own.filter((x) => x.icao !== hub.icao).sort((x, y) => greatCircleNm(x, hub) - greatCircleNm(y, hub))) {
      if (greatCircleNm(a, hub) < 150) continue
      if (picked.some((p) => greatCircleNm(p, a) < 220)) continue
      picked.push(a)
      if (picked.length >= 14) break
    }
    const hubStop: MapStop = { ...toStop(hub), role: 'focus' }
    return { id: 'net', stops: [], color: brand.route, glow: brand.routeGlow, width: 2.4, pairs: picked.map((a) => [toStop(a, 'feeder'), hubStop] as [MapStop, MapStop]) }
  }, [db, project, brand.route, brand.routeGlow])

  const view = useMemo(() => defaultMap({
    frame: 'full', theme: project.mapTheme, relief: true, reliefStrength: 1.1, labels: false, graticule: false,
    rivers: false, cities: false, guard: 0, routeWidth: 2.4, zoom: 0.92,
  }), [project.mapTheme])

  if (!route) return null
  return <RouteMap view={view} routes={[route]} accent={brand.accent} palette={paletteFor(view.theme, project.colors)} lang={lang} />
}

/** Instrument-style dial: 270° scale, progress arc in the project colour, needle, target in the centre. */
export function GoalGauge({ target, progress, unit, brand, lang }: { target: string; progress: string; unit: string; brand: BrandTheme; lang: Locale }) {
  const c = BANNER_COPY[lang]
  const t = num(target)
  const p = num(progress)
  const pct = t > 0 && progress.trim() ? Math.min(1, p / t) : null
  const cx = 1420
  const cy = 500
  const R = 300
  const a0 = 135
  const sweep = 270
  const pt = (deg: number, r: number) => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r]
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r)
    const [x2, y2] = pt(to, r)
    return `M${x1},${y1} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2},${y2}`
  }
  const lit = pct ?? 1
  const needle = a0 + sweep * (pct ?? 0)
  const ticks = Array.from({ length: 51 }, (_, i) => i)
  return (
    <svg className="scene scene--front" viewBox="0 0 1920 1080">
      <defs>
        <radialGradient id="gg-face" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#141c2b" stopOpacity="0.92" />
          <stop offset="1" stopColor="#05080e" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="gg-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={brand.accent} />
          <stop offset="1" stopColor={brand.accentSoft} />
        </linearGradient>
        <filter id="gg-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <circle cx={cx} cy={cy} r={R + 70} fill={brand.accent} opacity={0.08} filter="url(#gg-glow)" />
      <circle cx={cx} cy={cy} r={R + 46} fill="url(#gg-face)" stroke="rgba(255,255,255,.14)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={R + 34} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={10} />
      <path d={arc(a0, a0 + sweep, R)} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={26} strokeLinecap="round" />
      <path d={arc(a0, a0 + sweep * Math.max(0.002, lit), R)} fill="none" stroke={brand.accent} strokeWidth={30} strokeLinecap="round" opacity={0.45} filter="url(#gg-glow)" />
      <path d={arc(a0, a0 + sweep * Math.max(0.002, lit), R)} fill="none" stroke="url(#gg-arc)" strokeWidth={26} strokeLinecap="round" />
      {ticks.map((i) => {
        const deg = a0 + (sweep * i) / 50
        const major = i % 5 === 0
        const [x1, y1] = pt(deg, R - 34)
        const [x2, y2] = pt(deg, R - (major ? 62 : 46))
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)'} strokeWidth={major ? 4 : 2} strokeLinecap="round" />
      })}
      {ticks.filter((i) => i % 5 === 0).map((i) => {
        const [x, y] = pt(a0 + (sweep * i) / 50, R - 92)
        return <text key={i} x={x} y={y + 9} textAnchor="middle" fill="rgba(255,255,255,.6)" fontFamily="JetBrains Mono" fontWeight={700} fontSize={24}>{i * 2}</text>
      })}
      <text x={cx} y={cy - 120} textAnchor="middle" fill={brand.accentSoft} fontFamily="Oswald" fontWeight={600} fontSize={26} letterSpacing="0.32em">{c.target.toUpperCase()}</text>
      <text x={cx} y={cy + 40} textAnchor="middle" fill="#fff" fontFamily="Oswald" fontWeight={700} fontSize={fmtNum(target).length > 6 ? 118 : 150} style={{ filter: `drop-shadow(0 0 30px ${brand.routeGlow})` }}>{fmtNum(target)}</text>
      <text x={cx} y={cy + 92} textAnchor="middle" fill="rgba(255,255,255,.85)" fontFamily="Oswald" fontWeight={600} fontSize={30} letterSpacing="0.3em">{unit.toUpperCase()}</text>
      {pct !== null && (
        <g>
          {/* Pointer on the scale only, so it never crosses the target number. */}
          <g transform={`rotate(${needle} ${cx} ${cy})`}>
            <path d={`M${cx + R - 120},${cy - 7} L${cx + R - 30},${cy} L${cx + R - 120},${cy + 7} Z`} fill="#fff" />
            <circle cx={cx + R - 120} cy={cy} r={7} fill="#fff" />
          </g>
          <rect x={cx - 130} y={cy + 150} width={260} height={56} rx={28} fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.16)" />
          <text x={cx} y={cy + 188} textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontWeight={700} fontSize={26}>
            {Math.round(pct * 100)}% · {fmtNum(progress)}
          </text>
        </g>
      )}
      {pct === null && <circle cx={cx} cy={cy + 170} r={8} fill={brand.accent} />}
    </svg>
  )
}

/** Head-to-head arena: slanted team panels, aircraft flying at each other, VS in the middle. */
export function VersusArena({ teams, lang, brand }: { teams: Team[]; lang: Locale; brand: BrandTheme }) {
  const list = teams.slice(0, 4)
  const n = list.length
  const left = 112
  const right = 1824
  const top = 430
  const bottom = 872
  const gap = n === 2 ? 70 : 26
  const slant = 70
  const w = (right - left - gap * (n - 1)) / n
  return (
    <div className="b-arena">
      {list.map((t, i) => {
        const x = left + i * (w + gap)
        const color = TEAM_COLORS[i]
        const cur = num(t.current ?? '')
        const tgt = num(t.target)
        const pct = tgt > 0 && (t.current ?? '').trim() ? Math.min(1, cur / tgt) : null
        // Panels lean towards the centre so two teams "face" each other.
        const towards = n === 2 ? (i === 0 ? 1 : -1) : 0
        const clip = n === 2
          ? i === 0 ? `polygon(0 0, 100% 0, calc(100% - ${slant}px) 100%, 0 100%)` : `polygon(${slant}px 0, 100% 0, 100% 100%, 0 100%)`
          : `polygon(${slant / 2}px 0, 100% 0, calc(100% - ${slant / 2}px) 100%, 0 100%)`
        return (
          <div key={t.id} className="b-arena__team" style={{ left: x, top, width: w, height: bottom - top, clipPath: clip, ['--team' as string]: color, background: `linear-gradient(180deg, ${color}55 0%, ${color}1f 50%, rgba(6,10,16,.6) 100%), rgba(6,10,16,.88)` }}>
            <svg className="b-arena__plane" viewBox="0 0 100 100" style={{
              transform: `rotate(${towards === 0 ? -35 : towards * 90}deg)`,
              [i === 0 || n > 2 ? 'right' : 'left']: n === 2 ? 40 : -30,
            }}>
              <path d={AIRLINER} fill={color} />
            </svg>
            <div className="b-arena__body" style={{ paddingLeft: n === 2 && i === 1 ? slant + 40 : 44 }}>
              <span className="b-arena__name">{t.name}</span>
              <span className="b-arena__value" style={{ fontSize: n > 2 ? 104 : 150 }}>{fmtNum(t.target)}</span>
              <span className="b-arena__unit">{countUnit(t.countType, lang)}</span>
              {pct !== null && (
                <span className="b-arena__progress">
                  <span className="b-arena__bar"><i style={{ width: `${pct * 100}%` }} /></span>
                  <b>{Math.round(pct * 100)}%</b>
                </span>
              )}
            </div>
          </div>
        )
      })}
      {n === 2 && (
        <div className="b-arena__vs" style={{ left: (left + right) / 2, top: (top + bottom) / 2, boxShadow: `0 0 0 10px rgba(7,10,16,.9), 0 0 60px ${brand.routeGlow}` }}>VS</div>
      )}
    </div>
  )
}
