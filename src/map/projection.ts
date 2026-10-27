import {
  geoCircle, geoConicConformal, geoInterpolate, geoMercator, geoNaturalEarth1, geoOrthographic, geoAzimuthalEquidistant,
  type GeoProjection,
} from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { MapView } from '../types'

export const STAGE_W = 1920
export const STAGE_H = 1080

export type Box = [[number, number], [number, number]]

/**
 * Where the route must fit. "content" keeps it clear of the left text column
 * and the bottom reward/logo row; "full" uses the whole banner with a margin.
 */
export function fitBox(frame: MapView['frame']): Box {
  return frame === 'full' ? [[140, 130], [1780, 930]] : [[860, 150], [1820, 860]]
}

export const boxCenter = (b: Box): [number, number] => [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]

export interface FitTarget {
  points: [number, number][]
  shapes?: Feature<Geometry>[]
}

/** Circular mean of longitudes so routes across the antimeridian center correctly. */
function centerOf(points: [number, number][]): [number, number] {
  if (!points.length) return [37.6, 55.7]
  let x = 0
  let y = 0
  let lat = 0
  for (const [lon, la] of points) {
    x += Math.cos((lon * Math.PI) / 180)
    y += Math.sin((lon * Math.PI) / 180)
    lat += la
  }
  return [(Math.atan2(y, x) * 180) / Math.PI, lat / points.length]
}

function spanDeg(points: [number, number][]) {
  if (points.length < 2) return 0
  const lats = points.map((p) => p[1])
  const c = centerOf(points)[0]
  const lons = points.map((p) => ((p[0] - c + 540) % 360) - 180)
  return Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 1.6)
}

function baseProjection(kind: MapView['projection'], target: FitTarget): GeoProjection {
  const pts = target.points.length ? target.points : (target.shapes ?? []).length ? [] : [[37.6, 55.7] as [number, number]]
  const [lon0, lat0] = centerOf(pts.length ? pts : [[37.6, 55.7]])
  switch (kind) {
    case 'conic': {
      const lats = pts.map((p) => p[1])
      const lo = Math.min(...lats, lat0 - 4)
      const hi = Math.max(...lats, lat0 + 4)
      const p1 = lo + (hi - lo) / 6
      const p2 = hi - (hi - lo) / 6
      // Conformal conic needs non-symmetric, non-equatorial parallels.
      return geoConicConformal().rotate([-lon0, 0]).parallels(Math.abs(p1 + p2) < 2 ? [20, 50] : [p1, p2])
    }
    case 'natural':
      return geoNaturalEarth1().rotate([-lon0, 0])
    case 'globe':
      return geoOrthographic().rotate([-lon0, -Math.max(-60, Math.min(60, lat0)) * 0.85]).clipAngle(90)
    default:
      return geoMercator().rotate([-lon0, 0])
  }
}

/** Geometry used for fitting: padding circles around stops + great-circle arcs + highlighted shapes. */
function fitGeometry(target: FitTarget): FeatureCollection {
  const span = spanDeg(target.points)
  // Pad stops so a single airport or a short hop doesn't zoom to street level.
  const radius = Math.max(0.9, Math.min(4, span * 0.08 + 0.9))
  const features: Feature<Geometry>[] = target.points.map((p) => ({
    type: 'Feature', properties: {}, geometry: geoCircle().center(p).radius(radius).precision(20)(),
  }))
  for (let i = 1; i < target.points.length; i++) {
    const interp = geoInterpolate(target.points[i - 1], target.points[i])
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array.from({ length: 17 }, (_, k) => interp(k / 16)) } })
  }
  features.push(...(target.shapes ?? []))
  return { type: 'FeatureCollection', features }
}

export function autoProjectionKind(target: FitTarget, requested: MapView['projection']): MapView['projection'] {
  if (requested !== 'mercator') return requested
  // Mercator distorts badly on intercontinental routes: switch to Natural Earth.
  return spanDeg(target.points) > 140 ? 'natural' : 'mercator'
}

export interface Fitted {
  projection: GeoProjection
  /** Scale/translate of the pure auto-fit (zoom 1, no offset). */
  baseScale: number
  baseTranslate: [number, number]
  box: Box
}

export function fitProjection(view: MapView, target: FitTarget): Fitted {
  const kind = autoProjectionKind(target, view.projection)
  const box = fitBox(view.frame)
  const projection = baseProjection(kind, target)
  const geom = fitGeometry(target)
  if (geom.features.length) projection.fitExtent(box, geom)
  else projection.scale(900).translate(boxCenter(box))
  const baseScale = projection.scale()
  const baseTranslate = projection.translate() as [number, number]
  applyView(projection, { baseScale, baseTranslate, box }, view)
  if (kind !== 'globe') projection.clipExtent([[-60, -60], [STAGE_W + 60, STAGE_H + 60]])
  return { projection, baseScale, baseTranslate, box }
}

/** translate = c + (t0 − c)·zoom + d, so zoom 1 / d 0 is the exact auto-fit. */
export function applyView(projection: GeoProjection, fit: Pick<Fitted, 'baseScale' | 'baseTranslate' | 'box'>, view: Pick<MapView, 'zoom' | 'dx' | 'dy'>) {
  const c = boxCenter(fit.box)
  projection.scale(fit.baseScale * view.zoom)
  projection.translate([c[0] + (fit.baseTranslate[0] - c[0]) * view.zoom + view.dx, c[1] + (fit.baseTranslate[1] - c[1]) * view.zoom + view.dy])
}

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 12

/** New view after zooming by `factor` while keeping stage point `anchor` fixed. */
export function zoomAt(fit: Pick<Fitted, 'baseTranslate' | 'box'>, view: Pick<MapView, 'zoom' | 'dx' | 'dy'>, factor: number, anchor: [number, number]) {
  const c = boxCenter(fit.box)
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.zoom * factor))
  const f = zoom / view.zoom
  const T: [number, number] = [c[0] + (fit.baseTranslate[0] - c[0]) * view.zoom + view.dx, c[1] + (fit.baseTranslate[1] - c[1]) * view.zoom + view.dy]
  const Tn: [number, number] = [anchor[0] + (T[0] - anchor[0]) * f, anchor[1] + (T[1] - anchor[1]) * f]
  return {
    zoom,
    dx: Tn[0] - c[0] - (fit.baseTranslate[0] - c[0]) * zoom,
    dy: Tn[1] - c[1] - (fit.baseTranslate[1] - c[1]) * zoom,
  }
}

/** Geographic point under the fit-box center (for the numeric center readout). */
export function viewCenter(fitted: Fitted): [number, number] | null {
  const inv = fitted.projection.invert?.(boxCenter(fitted.box))
  return inv ? [inv[0], inv[1]] : null
}

/** Offset that puts `lonlat` exactly at the fit-box center at the current zoom. */
export function centerOn(fitted: Fitted, view: Pick<MapView, 'zoom' | 'dx' | 'dy'>, lonlat: [number, number]) {
  const p = fitted.projection(lonlat)
  if (!p) return null
  const c = boxCenter(fitted.box)
  return { dx: view.dx + (c[0] - p[0]), dy: view.dy + (c[1] - p[1]) }
}

/** Radar scope projection: azimuthal equidistant around the sector, fitted to a box. */
export function radarProjection(center: [number, number], shape: Feature<Geometry> | null, box: Box) {
  const p = geoAzimuthalEquidistant().rotate([-center[0], -center[1]])
  if (shape) p.fitExtent(box, shape)
  else p.scale(2400).translate(boxCenter(box))
  return p
}
