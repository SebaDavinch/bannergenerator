import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoGraticule10, geoInterpolate, geoPath, type GeoProjection } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import { useWorld } from '../data/geo'
import { useStage } from '../banner/context'
import type { MapView } from '../types'
import { MAP_THEMES } from './themes'
import { STAGE_H, STAGE_W, fitProjection, zoomAt, type FitTarget } from './projection'

export interface MapStop {
  icao: string
  lon: number
  lat: number
  country: string
  city?: string
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
  labelCity?: boolean
  /** Include highlighted shapes in the auto-fit (off: fit airports/routes only, shapes may overflow). */
  fitShapes?: boolean
}

interface Label { key: string; x: number; y: number; w: number; h: number; stop: MapStop }

const CHIP_H = 34

function legPath(projection: GeoProjection, a: MapStop, b: MapStop, bow: number) {
  const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])
  const pts: [number, number][] = []
  for (let i = 0; i <= 48; i++) {
    const p = projection(interp(i / 48))
    if (p) pts.push(p as [number, number])
  }
  if (pts.length < 2) return { d: '', mid: null as null | { x: number; y: number; angle: number } }
  const [x0, y0] = pts[0]
  const [x1, y1] = pts[pts.length - 1]
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = -(y1 - y0) / len
  const ny = (x1 - x0) / len
  const amp = Math.min(70, len * 0.14) * bow
  const bent = pts.map(([x, y], i) => {
    const t = i / (pts.length - 1)
    const k = Math.sin(Math.PI * t) * amp
    return [x + nx * k, y + ny * k] as [number, number]
  })
  const m = Math.floor(bent.length / 2)
  const angle = (Math.atan2(bent[m + 1][1] - bent[m - 1][1], bent[m + 1][0] - bent[m - 1][0]) * 180) / Math.PI
  return { d: 'M' + bent.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L'), mid: { x: bent[m][0], y: bent[m][1], angle } }
}

/** Greedy label placement around each node: 8 candidate slots, avoid overlaps and banner edges. */
function placeLabels(points: { x: number; y: number; stop: MapStop }[], labelCity: boolean, avoidLeft: number): Label[] {
  const placed: Label[] = []
  const nodes = points.map((p) => ({ x: p.x - 14, y: p.y - 14, w: 28, h: 28 }))
  const hit = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4
  for (const p of points) {
    const text = labelCity && p.stop.city ? `${p.stop.icao} · ${p.stop.city}` : p.stop.icao
    const w = 46 + text.length * (labelCity ? 11.5 : 14.5)
    const h = CHIP_H
    const g = 16
    const slots = [
      [g, -h - g / 2], [g, g / 2], [-w - g, -h - g / 2], [-w - g, g / 2],
      [-w / 2, -h - g - 6], [-w / 2, g + 6], [g + 6, -h / 2], [-w - g - 6, -h / 2],
    ]
    let best: Label | null = null
    let bestCost = Infinity
    for (let i = 0; i < slots.length; i++) {
      const box = { key: p.stop.icao, x: p.x + slots[i][0], y: p.y + slots[i][1], w, h, stop: p.stop }
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

function RouteMapInner({ view, onView, routes, extraStops = [], shapes = [], accent, labelCity, fitShapes = true }: Props) {
  const world = useWorld()
  const { scale, interactive } = useStage()
  const palette = MAP_THEMES[view.theme] ?? MAP_THEMES.night
  const rootRef = useRef<HTMLDivElement>(null)
  // Transient gesture transform (applied by CSS, committed to the projection on release).
  const [gesture, setGesture] = useState<{ tx: number; ty: number; k: number; ox: number; oy: number } | null>(null)
  const commitTimer = useRef<number | undefined>(undefined)

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

  const layers = useMemo(() => {
    const land = world ? path(world.land) ?? '' : ''
    const borders = world && view.borders ? path(world.borders) ?? '' : ''
    const graticule = view.graticule ? path(geoGraticule10()) ?? '' : ''
    const sphere = view.projection === 'globe' ? path({ type: 'Sphere' }) ?? '' : ''
    return { land, borders, graticule, sphere }
  }, [world, path, view.borders, view.graticule, view.projection])

  const shapePaths = useMemo(() => shapes.map((s) => ({ ...s, d: path(s.feature) ?? '' })), [shapes, path])

  const drawn = useMemo(() => {
    const seen = new Map<string, number>()
    const legs: { key: string; d: string; color: string; glow: string; dashed?: boolean; width: number; mid: ReturnType<typeof legPath>['mid'] }[] = []
    for (const r of routes) {
      const pairs = r.pairs ?? r.stops.slice(1).map((s, i) => [r.stops[i], s] as [MapStop, MapStop])
      for (const [a, b] of pairs) {
        if (a.icao === b.icao) continue
        // Reverse/duplicate legs bow to the other side so A→B and B→A stay readable.
        const key = [a.icao, b.icao].sort().join('-')
        const n = seen.get(key) ?? 0
        seen.set(key, n + 1)
        const bow = (n % 2 === 0 ? 1 : -1) * (1 + Math.floor(n / 2) * 0.8) * (a.icao < b.icao ? 1 : -1)
        const { d, mid } = legPath(fitted.projection, a, b, bow)
        if (d) legs.push({ key: `${r.id}-${a.icao}-${b.icao}-${n}`, d, color: r.color, glow: r.glow, dashed: r.dashed, width: r.width ?? 4, mid })
      }
    }
    const pts = allStops
      .map((s) => {
        const p = fitted.projection([s.lon, s.lat])
        return p ? { x: p[0], y: p[1], stop: s } : null
      })
      .filter((p): p is { x: number; y: number; stop: MapStop } => !!p && p.x > -20 && p.x < STAGE_W + 20 && p.y > -20 && p.y < STAGE_H + 20)
    const labels = view.labels ? placeLabels(pts.filter((p) => p.stop.role !== 'feeder'), !!labelCity, view.frame === 'content' ? 780 : 0) : []
    return { legs, pts, labels }
  }, [routes, allStops, fitted, view.labels, view.frame, labelCity])

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
    if (gesture) commitGesture(gesture)
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
    const anchor = toStage(e.clientX, e.clientY)
    onView(zoomAt(fitted, view, e.shiftKey ? 1 / 1.6 : 1.6, anchor))
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
      onView(zoomAt(fitted, view, e.key === '-' ? 1 / 1.15 : 1.15, [fitted.box[0][0] / 2 + fitted.box[1][0] / 2, fitted.box[0][1] / 2 + fitted.box[1][1] / 2]))
    }
  }

  const transform = gesture
    ? `translate(${gesture.tx}px, ${gesture.ty}px) translate(${gesture.ox}px, ${gesture.oy}px) scale(${gesture.k}) translate(${-gesture.ox}px, ${-gesture.oy}px)`
    : undefined

  const gid = `m${view.theme}`
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
        <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} width={STAGE_W} height={STAGE_H}>
          <defs>
            <filter id={`${gid}-soft`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10" /></filter>
            <filter id={`${gid}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          {layers.sphere && <path d={layers.sphere} fill={palette.seaInner} stroke={palette.landStroke} strokeWidth={1.5} />}
          {layers.graticule && <path d={layers.graticule} fill="none" stroke={palette.graticule} strokeWidth={1.2} />}
          <path d={layers.land} fill={palette.landShadow} transform="translate(0 10)" filter={`url(#${gid}-soft)`} opacity={0.8} />
          <path d={layers.land} fill={palette.land} stroke={palette.landStroke} strokeWidth={1.3} strokeLinejoin="round" />
          {layers.borders && <path d={layers.borders} fill="none" stroke={palette.border} strokeWidth={1.1} strokeLinejoin="round" />}
          {shapePaths.map((s) => (
            <g key={s.id}>
              <path d={s.d} fill={s.color} fillOpacity={palette.firFillOpacity} stroke="none" />
              <path d={s.d} fill="none" stroke={s.color} strokeWidth={2.4} strokeOpacity={0.9} strokeDasharray="10 6" strokeLinejoin="round" />
            </g>
          ))}
          {drawn.legs.map((l) => (
            <g key={l.key}>
              <path d={l.d} fill="none" stroke={l.glow} strokeWidth={l.width * 4} strokeLinecap="round" filter={`url(#${gid}-glow)`} opacity={0.75} />
              <path d={l.d} fill="none" stroke={l.color} strokeWidth={l.width} strokeLinecap="round" strokeDasharray={l.dashed ? '2 12' : undefined} />
              {l.mid && (
                <path d="M -9 -7 L 7 0 L -9 7 Z" fill={l.color} transform={`translate(${l.mid.x} ${l.mid.y}) rotate(${l.mid.angle})`} />
              )}
            </g>
          ))}
          {drawn.pts.map(({ x, y, stop }) => {
            const focus = stop.role === 'focus'
            const feeder = stop.role === 'feeder'
            const r = focus ? 13 : stop.role === 'start' ? 11 : feeder ? 5 : 9
            return (
              <g key={stop.icao} transform={`translate(${x} ${y})`}>
                {focus && <circle r={42} fill="none" stroke={stop.color ?? accent} strokeOpacity={0.35} strokeWidth={2} />}
                {focus && <circle r={26} fill={stop.color ?? accent} fillOpacity={0.18} />}
                {!feeder && <circle r={r + 9} fill={stop.color ?? accent} fillOpacity={0.16} />}
                <circle r={r} fill={feeder ? (stop.color ?? accent) : palette.node} stroke={feeder ? 'none' : palette.nodeStroke} strokeWidth={3} />
                {!feeder && <circle r={r * 0.42} fill={stop.color ?? accent} />}
              </g>
            )
          })}
        </svg>
        {drawn.labels.map((l) => (
          <div
            key={l.key}
            className="route-map__chip"
            style={{ left: l.x, top: l.y, height: l.h, background: palette.chipBg, color: palette.chipText, borderColor: palette.chipBorder }}
          >
            {l.stop.country && <span className={`fi fi-${l.stop.country.toLowerCase()} route-map__flag`} />}
            <span className="route-map__icao">{l.stop.icao}</span>
            {labelCity && l.stop.city && <span className="route-map__city">{l.stop.city}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export const RouteMap = memo(RouteMapInner)
