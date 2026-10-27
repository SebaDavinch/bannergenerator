import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoGraticule10, geoInterpolate, geoPath, type GeoProjection } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import { useWorld } from '../data/geo'
import { usePhysical } from '../data/physical'
import { useStage } from '../banner/context'
import type { Locale, MapView } from '../types'
import type { MapPalette } from './themes'
import { STAGE_H, STAGE_W, fitProjection, zoomAt, type FitTarget } from './projection'
import { useRelief } from './relief'

export interface MapStop {
  icao: string
  lon: number
  lat: number
  country: string
  city?: string
  cityRu?: string
  /** start = first stop of a route; focus = highlighted (overload/online day); feeder = small origin */
  role?: 'start' | 'stop' | 'focus' | 'feeder'
  color?: string
}

export interface MapRoute {
  id: string
  stops: MapStop[]
  color: string
  glow: string
  /** Draw each leg as its own segment (legs list) instead of a chain of stops. */
  pairs?: [MapStop, MapStop][]
  dashed?: boolean
  width?: number
}

export interface MapShape {
  id: string
  feature: Feature<Geometry>
  color: string
  label?: string
}

interface Props {
  view: MapView
  onView?: (patch: Partial<MapView>) => void
  routes: MapRoute[]
  extraStops?: MapStop[]
  shapes?: MapShape[]
  accent: string
  palette: MapPalette
  lang: Locale
  /** Force city names in chips (overrides view.labelMode 'icao'). */
  labelCity?: boolean
  /** Number stops in visiting order (tours). Also enabled by view.numbers. */
  numbered?: boolean
  /** Include highlighted shapes in the auto-fit (off: fit airports/routes only, shapes may overflow). */
  fitShapes?: boolean
}

interface Box { x: number; y: number; w: number; h: number }
interface Label extends Box { key: string; stop: MapStop; text: string; showIcao: boolean; showCity: boolean }

const CHIP_H = 34
const DASH: Record<MapView['routeStyle'], string | undefined> = { solid: undefined, dashed: '18 12', dotted: '0.1 14' }

function legPath(projection: GeoProjection, a: MapStop, b: MapStop, bow: number) {
  const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])
  const pts: [number, number][] = []
  for (let i = 0; i <= 64; i++) {
    const p = projection(interp(i / 64))
    if (p) pts.push(p as [number, number])
  }
  if (pts.length < 3) return { d: '', mid: null as null | { x: number; y: number; angle: number } }
  const [x0, y0] = pts[0]
  const [x1, y1] = pts[pts.length - 1]
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = -(y1 - y0) / len
  const ny = (x1 - x0) / len
  const amp = Math.min(70, len * 0.14) * bow
  const bent = pts.map(([x, y], i) => {
    const k = Math.sin(Math.PI * (i / (pts.length - 1))) * amp
    return [x + nx * k, y + ny * k] as [number, number]
  })
  const m = Math.floor(bent.length / 2)
  const angle = (Math.atan2(bent[m + 1][1] - bent[m - 1][1], bent[m + 1][0] - bent[m - 1][0]) * 180) / Math.PI
  return { d: 'M' + bent.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L'), mid: { x: bent[m][0], y: bent[m][1], angle } }
}

const hit = (a: Box, b: Box, pad = 6) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4

/** Greedy label placement around each node: 8 candidate slots, avoid overlaps, banner edges and the text column. */
function placeLabels(points: { x: number; y: number; stop: MapStop }[], mode: MapView['labelMode'], lang: Locale, avoidLeft: number): Label[] {
  const placed: Label[] = []
  const nodes = points.map((p) => ({ x: p.x - 14, y: p.y - 14, w: 28, h: 28 }))
  for (const p of points) {
    const city = (lang === 'ru' && p.stop.cityRu) || p.stop.city || ''
    const showCity = mode !== 'icao' && !!city
    const showIcao = mode !== 'city' || !city
    const text = [showIcao ? p.stop.icao : '', showCity ? city : ''].filter(Boolean).join(' ')
    const w = 46 + (showIcao ? p.stop.icao.length * 13.5 : 0) + (showCity ? city.length * 10.4 + 8 : 0)
    const h = CHIP_H
    const g = 16
    const slots = [
      [g, -h - g / 2], [g, g / 2], [-w - g, -h - g / 2], [-w - g, g / 2],
      [-w / 2, -h - g - 6], [-w / 2, g + 6], [g + 6, -h / 2], [-w - g - 6, -h / 2],
    ]
    let best: Label | null = null
    let bestCost = Infinity
    for (let i = 0; i < slots.length; i++) {
      const box = { key: p.stop.icao, x: p.x + slots[i][0], y: p.y + slots[i][1], w, h, stop: p.stop, text, showCity, showIcao }
      let cost = i * 0.5
      if (box.x < 24 || box.y < 24 || box.x + w > STAGE_W - 24 || box.y + h > STAGE_H - 24) cost += 50
      if (box.x < avoidLeft) cost += 30
      for (const o of placed) if (hit(box, o)) cost += 100
      for (const n of nodes) if (hit(box, n)) cost += 40
      if (cost < bestCost) { bestCost = cost; best = box }
    }
    if (best) placed.push(best)
  }
  return placed
}

function RouteMapInner({ view, onView, routes, extraStops = [], shapes = [], accent, palette, lang, labelCity, numbered, fitShapes = true }: Props) {
  const world = useWorld()
  const physical = usePhysical()
  const { scale, interactive } = useStage()
  const rootRef = useRef<HTMLDivElement>(null)
  // Transient gesture transform (applied by CSS, committed to the projection on release).
  const [gesture, setGesture] = useState<{ tx: number; ty: number; k: number; ox: number; oy: number } | null>(null)
  const commitTimer = useRef<number | undefined>(undefined)
  const labelMode: MapView['labelMode'] = labelCity && view.labelMode === 'icao' ? 'icao-city' : view.labelMode ?? 'icao'

  const allStops = useMemo(() => {
    const map = new Map<string, MapStop>()
    for (const r of routes) {
      const list = r.pairs ? r.pairs.flat() : r.stops
      list.forEach((s, i) => {
        const prev = map.get(s.icao)
        const role = prev?.role === 'focus' ? 'focus' : i === 0 && !r.pairs ? 'start' : (prev?.role ?? s.role ?? 'stop')
        map.set(s.icao, { ...s, role, color: prev?.color ?? r.color })
      })
    }
    for (const s of extraStops) map.set(s.icao, { ...map.get(s.icao), ...s })
    return [...map.values()]
  }, [routes, extraStops])

  const target: FitTarget = useMemo(() => ({
    points: allStops.map((s) => [s.lon, s.lat] as [number, number]),
    shapes: fitShapes || !allStops.length ? shapes.map((s) => s.feature) : [],
  }), [allStops, shapes, fitShapes])

  const fitted = useMemo(() => fitProjection(view, target), [view, target])
  const path = useMemo(() => geoPath(fitted.projection), [fitted])
  const relief = useRelief(fitted.spec, palette.relief, view.reliefStrength ?? 1, view.relief ?? false, !gesture)

  const layers = useMemo(() => {
    const land = world ? path(world.land) ?? '' : ''
    const borders = world && view.borders ? path(world.borders) ?? '' : ''
    const graticule = view.graticule ? path(geoGraticule10()) ?? '' : ''
    const sphere = view.projection === 'globe' ? path({ type: 'Sphere' }) ?? '' : ''
    const showRivers = view.rivers && physical
    // Minor rivers only once zoomed in enough for them to read.
    const kmPerPx = 40075 / (fitted.projection.scale() * 2 * Math.PI)
    const riversMajor = showRivers ? path({ type: 'FeatureCollection', features: physical.rivers.features.filter((f) => (f.properties?.r ?? 9) <= 3) }) ?? '' : ''
    const riversMinor = showRivers && kmPerPx < 2.5 ? path({ type: 'FeatureCollection', features: physical.rivers.features.filter((f) => (f.properties?.r ?? 9) > 3) }) ?? '' : ''
    const lakes = view.rivers && physical ? path(physical.lakes) ?? '' : ''
    return { land, borders, graticule, sphere, riversMajor, riversMinor, lakes }
  }, [world, physical, path, fitted, view.borders, view.graticule, view.projection, view.rivers])

  const shapePaths = useMemo(() => shapes.map((s) => ({ ...s, d: path(s.feature) ?? '' })), [shapes, path])

  const drawn = useMemo(() => {
    const seen = new Map<string, number>()
    const legs: { key: string; d: string; color: string; glow: string; dashed?: boolean; width: number; mid: ReturnType<typeof legPath>['mid'] }[] = []
    const order: string[] = []
    for (const r of routes) {
      const pairs = r.pairs ?? r.stops.slice(1).map((s, i) => [r.stops[i], s] as [MapStop, MapStop])
      for (const [a, b] of pairs) {
        if (!order.includes(a.icao)) order.push(a.icao)
        if (!order.includes(b.icao)) order.push(b.icao)
        if (a.icao === b.icao) continue
        // Reverse/duplicate legs bow to the other side so A→B and B→A stay readable.
        const key = [a.icao, b.icao].sort().join('-')
        const n = seen.get(key) ?? 0
        seen.set(key, n + 1)
        const bow = (n % 2 === 0 ? 1 : -1) * (1 + Math.floor(n / 2) * 0.8) * (a.icao < b.icao ? 1 : -1)
        const { d, mid } = legPath(fitted.projection, a, b, bow)
        if (d) legs.push({ key: `${r.id}-${a.icao}-${b.icao}-${n}`, d, color: r.color, glow: r.glow, dashed: r.dashed, width: r.width ?? view.routeWidth ?? 4, mid })
      }
    }
    const pts = allStops
      .map((s) => {
        const p = fitted.projection([s.lon, s.lat])
        return p ? { x: p[0], y: p[1], stop: s } : null
      })
      .filter((p): p is { x: number; y: number; stop: MapStop } => !!p && p.x > -20 && p.x < STAGE_W + 20 && p.y > -20 && p.y < STAGE_H + 20)
    const avoid = view.frame === 'content' ? 780 : 0
    const labels = view.labels ? placeLabels(pts.filter((p) => p.stop.role !== 'feeder'), labelMode, lang, avoid) : []

    // Context cities: biggest first, kept clear of route nodes, chips and each other.
    const cities: { x: number; y: number; name: string; cap: boolean }[] = []
    if (view.cities && physical) {
      const taken: Box[] = [...labels, ...pts.map((p) => ({ x: p.x - 18, y: p.y - 18, w: 36, h: 36 }))]
      for (const pl of physical.places) {
        if (cities.length >= 18) break
        const p = fitted.projection([pl[3], pl[4]])
        if (!p || p[0] < Math.max(40, avoid) || p[0] > STAGE_W - 40 || p[1] < 60 || p[1] > STAGE_H - 230) continue
        const name = (lang === 'ru' && pl[1]) || pl[0]
        const box = { x: p[0] - 6, y: p[1] - 12, w: 20 + name.length * 10, h: 24 }
        if (taken.some((t) => hit(box, t, 14))) continue
        taken.push(box)
        cities.push({ x: p[0], y: p[1], name, cap: pl[6] === 1 })
      }
    }
    return { legs, pts, labels, order, cities }
  }, [routes, allStops, fitted, view.labels, view.frame, view.routeWidth, view.cities, labelMode, lang, physical])

  // ── interaction ────────────────────────────────────────────────────────
  const editable = interactive && !!onView && !view.locked
  const toStage = useCallback((clientX: number, clientY: number): [number, number] => {
    const r = rootRef.current!.getBoundingClientRect()
    return [(clientX - r.left) / scale, (clientY - r.top) / scale]
  }, [scale])

  const commitGesture = useCallback((g: NonNullable<typeof gesture>) => {
    if (!onView) return
    let next = { zoom: view.zoom, dx: view.dx, dy: view.dy }
    if (g.k !== 1) next = { ...next, ...zoomAt(fitted, next, g.k, [g.ox, g.oy]) }
    next.dx += g.tx
    next.dy += g.ty
    onView({ zoom: +next.zoom.toFixed(4), dx: Math.round(next.dx * 10) / 10, dy: Math.round(next.dy * 10) / 10 })
    setGesture(null)
  }, [onView, view.zoom, view.dx, view.dy, fitted])

  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!editable || e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    setGesture({ tx: 0, ty: 0, k: 1, ox: 0, oy: 0 })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const tx = (e.clientX - drag.current.x) / scale
    const ty = (e.clientY - drag.current.y) / scale
    setGesture((g) => (g ? { ...g, tx, ty } : g))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (gesture) {
      if (gesture.tx === 0 && gesture.ty === 0 && gesture.k === 1) setGesture(null)
      else commitGesture(gesture)
    }
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el || !editable) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const [ox, oy] = toStage(e.clientX, e.clientY)
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))
      setGesture((g) => {
        const base = g && g.tx === 0 && g.ty === 0 ? g : { tx: 0, ty: 0, k: 1, ox, oy }
        // Keep one anchor per wheel burst; it is exact for the committed zoom.
        const next = { ...base, k: Math.min(8, Math.max(0.125, base.k * factor)) }
        window.clearTimeout(commitTimer.current)
        commitTimer.current = window.setTimeout(() => commitGesture(next), 160)
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [editable, toStage, commitGesture])

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!editable || !onView) return
    onView(zoomAt(fitted, view, e.shiftKey ? 1 / 1.6 : 1.6, toStage(e.clientX, e.clientY)))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!editable || !onView) return
    const step = e.shiftKey ? 60 : 8
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    if (moves[e.key]) {
      e.preventDefault()
      onView({ dx: view.dx + moves[e.key][0], dy: view.dy + moves[e.key][1] })
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault()
      onView(zoomAt(fitted, view, e.key === '-' ? 1 / 1.15 : 1.15, [(fitted.box[0][0] + fitted.box[1][0]) / 2, (fitted.box[0][1] + fitted.box[1][1]) / 2]))
    }
  }

  const transform = gesture
    ? `translate(${gesture.tx}px, ${gesture.ty}px) translate(${gesture.ox}px, ${gesture.oy}px) scale(${gesture.k}) translate(${-gesture.ox}px, ${-gesture.oy}px)`
    : undefined

  const gid = `m${view.theme}`
  const hasRelief = !!relief
  const showNumbers = numbered || view.numbers
  const dash = DASH[view.routeStyle ?? 'solid']
  return (
    <div
      ref={rootRef}
      className={`route-map ${editable ? 'is-editable' : ''} ${gesture ? 'is-gesture' : ''}`}
      tabIndex={editable ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      style={{ background: `radial-gradient(120% 120% at 62% 42%, ${palette.seaInner} 0%, ${palette.seaOuter} 100%)` }}
    >
      <div className="route-map__layer" style={{ transform, transformOrigin: '0 0' }}>
        {hasRelief && <img className="route-map__relief" src={relief} alt="" draggable={false} />}
        <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} width={STAGE_W} height={STAGE_H}>
          <defs>
            <filter id={`${gid}-soft`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10" /></filter>
            <filter id={`${gid}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          {layers.sphere && !hasRelief && <path d={layers.sphere} fill={palette.seaInner} />}
          {!hasRelief && <path d={layers.land} fill={palette.landShadow} transform="translate(0 10)" filter={`url(#${gid}-soft)`} opacity={0.8} />}
          {!hasRelief && <path d={layers.land} fill={palette.land} />}
          {!hasRelief && layers.lakes && <path d={layers.lakes} fill={palette.lake} />}
          {layers.graticule && <path d={layers.graticule} fill="none" stroke={palette.graticule} strokeWidth={1.2} />}
          {layers.riversMinor && <path d={layers.riversMinor} fill="none" stroke={palette.river} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />}
          {layers.riversMajor && <path d={layers.riversMajor} fill="none" stroke={palette.river} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
          {hasRelief && layers.lakes && <path d={layers.lakes} fill="none" stroke={palette.river} strokeWidth={1} opacity={0.6} />}
          <path d={layers.land} fill="none" stroke={palette.landStroke} strokeWidth={hasRelief ? 1.1 : 1.3} strokeLinejoin="round" />
          {layers.borders && <path d={layers.borders} fill="none" stroke={palette.border} strokeWidth={1.2} strokeDasharray={hasRelief ? '6 4' : undefined} strokeLinejoin="round" />}
          {layers.sphere && <path d={layers.sphere} fill="none" stroke={palette.landStroke} strokeWidth={1.5} />}
          {shapePaths.map((s) => (
            <g key={s.id}>
              <path d={s.d} fill={s.color} fillOpacity={palette.firFillOpacity} stroke="none" />
              <path d={s.d} fill="none" stroke={s.color} strokeWidth={2.4} strokeOpacity={0.9} strokeDasharray="10 6" strokeLinejoin="round" />
            </g>
          ))}
          {drawn.cities.map((c) => (
            <g key={c.name} transform={`translate(${c.x} ${c.y})`}>
              {c.cap ? <rect x={-4.5} y={-4.5} width={9} height={9} fill={palette.cityDot} transform="rotate(45)" /> : <circle r={3.6} fill={palette.cityDot} />}
              <text x={9} y={6} fill={palette.cityText} fontFamily="Inter" fontWeight={500} fontSize={17} style={{ paintOrder: 'stroke' }} stroke={palette.light ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.55)'} strokeWidth={3}>{c.name}</text>
            </g>
          ))}
          {drawn.legs.map((l) => (
            <g key={l.key}>
              <path d={l.d} fill="none" stroke={l.glow} strokeWidth={l.width * 4} strokeLinecap="round" filter={`url(#${gid}-glow)`} opacity={0.75} />
              <path d={l.d} fill="none" stroke={l.color} strokeWidth={l.width} strokeLinecap="round" strokeDasharray={l.dashed ? '2 12' : dash} />
              {l.mid && <path d="M -9 -7 L 7 0 L -9 7 Z" fill={l.color} transform={`translate(${l.mid.x} ${l.mid.y}) rotate(${l.mid.angle})`} />}
            </g>
          ))}
          {drawn.pts.map(({ x, y, stop }) => {
            const focus = stop.role === 'focus'
            const feeder = stop.role === 'feeder'
            const r = focus ? 13 : stop.role === 'start' ? 11 : feeder ? 5 : 9
            const n = drawn.order.indexOf(stop.icao) + 1
            return (
              <g key={stop.icao} transform={`translate(${x} ${y})`}>
                {focus && <circle r={42} fill="none" stroke={stop.color ?? accent} strokeOpacity={0.35} strokeWidth={2} />}
                {focus && <circle r={26} fill={stop.color ?? accent} fillOpacity={0.18} />}
                {!feeder && <circle r={r + 9} fill={stop.color ?? accent} fillOpacity={0.16} />}
                {showNumbers && !feeder && n > 0 ? (
                  <>
                    <circle r={17} fill={stop.color ?? accent} stroke={palette.nodeStroke} strokeWidth={3} />
                    <text y={7} textAnchor="middle" fill="#fff" fontFamily="Oswald" fontWeight={700} fontSize={20}>{n}</text>
                  </>
                ) : (
                  <>
                    <circle r={r} fill={feeder ? (stop.color ?? accent) : palette.node} stroke={feeder ? 'none' : palette.nodeStroke} strokeWidth={3} />
                    {!feeder && <circle r={r * 0.42} fill={stop.color ?? accent} />}
                  </>
                )}
              </g>
            )
          })}
        </svg>
        {drawn.labels.map((l) => (
          <div key={l.key} className="route-map__chip" style={{ left: l.x, top: l.y, height: l.h, background: palette.chipBg, color: palette.chipText, borderColor: palette.chipBorder }}>
            {l.stop.country && <span className={`fi fi-${l.stop.country.toLowerCase()} route-map__flag`} />}
            {l.showIcao && <span className="route-map__icao">{l.stop.icao}</span>}
            {l.showCity && <span className={l.showIcao ? 'route-map__city' : 'route-map__city route-map__city--main'}>{(lang === 'ru' && l.stop.cityRu) || l.stop.city}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export const RouteMap = memo(RouteMapInner)
