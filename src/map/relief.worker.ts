/// <reference lib="webworker" />
import { geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { projectionFromSpec, type ProjectionSpec } from './projection'
import type { ReliefPalette, Stop } from './themes'

/*
 * Shaded-relief renderer. For every output pixel: inverse-project to lon/lat,
 * sample Terrarium elevation (AWS Open Data, bundled z0–3 offline), hillshade
 * in screen space and colour with the palette's hypsometric / bathymetric
 * ramps. Land vs water comes from the vector coastline so it lines up exactly
 * with the SVG layers drawn on top.
 */

export interface ReliefRequest {
  id: number
  spec: ProjectionSpec
  width: number
  height: number
  /** Output pixels per stage pixel (0.5 for quick preview, 1 for final). */
  resolution: number
  palette: ReliefPalette
  strength: number
  base: string
  water?: { land: FeatureCollection<Geometry>; lakes: FeatureCollection<Geometry> }
}

export interface ReliefResponse { id: number; blob?: Blob; error?: string; zoom?: number }

const TILE = 256
const REMOTE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
let water: ReliefRequest['water']
const tileCache = new Map<string, Promise<Float32Array | null>>()

function decode(data: Uint8ClampedArray) {
  const out = new Float32Array(TILE * TILE)
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = data[j] * 256 + data[j + 1] + data[j + 2] / 256 - 32768
  return out
}

function loadTile(base: string, z: number, x: number, y: number): Promise<Float32Array | null> {
  const key = `${z}/${x}/${y}`
  let p = tileCache.get(key)
  if (!p) {
    const urls = z <= 3 ? [`${base}terrain/${key}.png`] : [`${REMOTE}/${key}.png`]
    p = (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url)
          if (!res.ok) continue
          const bmp = await createImageBitmap(await res.blob())
          const c = new OffscreenCanvas(TILE, TILE)
          const ctx = c.getContext('2d', { willReadFrequently: true })!
          ctx.drawImage(bmp, 0, 0)
          bmp.close()
          return decode(ctx.getImageData(0, 0, TILE, TILE).data)
        } catch { /* try next */ }
      }
      return null
    })()
    tileCache.set(key, p)
  }
  return p
}

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

/** 1-metre lookup table for a ramp, so the per-pixel colouring is an index read. */
function ramp(stops: Stop[], from: number, to: number) {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]).map(([v, c]) => [v, rgb(c)] as [number, number[]])
  const n = to - from + 1
  const lut = new Uint8ClampedArray(n * 3)
  for (let i = 0; i < n; i++) {
    const v = from + i
    let k = 0
    while (k < sorted.length - 1 && sorted[k + 1][0] < v) k++
    const a = sorted[k]
    const b = sorted[Math.min(sorted.length - 1, k + 1)]
    const t = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (v - a[0]) / (b[0] - a[0])))
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * t
  }
  return lut
}

async function render(req: ReliefRequest): Promise<ReliefResponse> {
  if (req.water) water = req.water
  const W = Math.round(req.width * req.resolution)
  const H = Math.round(req.height * req.resolution)
  const projection = projectionFromSpec({ ...req.spec, scale: req.spec.scale * req.resolution, translate: [req.spec.translate[0] * req.resolution, req.spec.translate[1] * req.resolution] })
  const invert = projection.invert!

  // 1. inverse projection
  const lon = new Float32Array(W * H)
  const lat = new Float32Array(W * H)
  const valid = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const p = invert([x + 0.5, y + 0.5])
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue
      if (req.spec.kind === 'globe') {
        // orthographic invert also answers outside the disc; reject those
        const back = projection(p)
        if (!back || Math.abs(back[0] - x - 0.5) > 1 || Math.abs(back[1] - y - 0.5) > 1) continue
      }
      lon[i] = p[0]
      lat[i] = Math.max(-85.05, Math.min(85.05, p[1]))
      valid[i] = 1
    }
  }

  // 2. pick a tile zoom whose pixels match the output pixel size
  const cx = Math.floor(W / 2) + Math.floor(H / 2) * W
  const mpp = valid[cx] && valid[cx + 1]
    ? Math.max(1, Math.hypot((lon[cx + 1] - lon[cx]) * Math.cos((lat[cx] * Math.PI) / 180), lat[cx + 1] - lat[cx]) * 111320)
    : 20000
  let z = Math.round(Math.log2((156543 * Math.cos(((valid[cx] ? lat[cx] : 0) * Math.PI) / 180)) / mpp))
  z = Math.max(0, Math.min(11, z))
  const mercX = (lo: number, zz: number) => ((lo + 180) / 360) * 2 ** zz * TILE
  const mercY = (la: number, zz: number) => {
    const r = (la * Math.PI) / 180
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** zz * TILE
  }
  const need = (zz: number) => {
    const keys = new Set<string>()
    for (let i = 0; i < W * H; i += 7) {
      if (!valid[i]) continue
      const tx = Math.floor(mercX(lon[i], zz) / TILE)
      const ty = Math.floor(mercY(lat[i], zz) / TILE)
      keys.add(`${((tx % 2 ** zz) + 2 ** zz) % 2 ** zz}/${Math.max(0, Math.min(2 ** zz - 1, ty))}`)
    }
    return keys
  }
  let keys = need(z)
  while (keys.size > 160 && z > 0) keys = need(--z)

  const tiles = new Map<string, Float32Array | null>()
  await Promise.all([...keys].map(async (k) => {
    const [x, y] = k.split('/').map(Number)
    tiles.set(k, await loadTile(req.base, z, x, y))
  }))
  // Offline / failed tiles fall back to the bundled z3 set.
  const fz = Math.min(3, z)
  const fallback = new Map<string, Float32Array | null>()
  if ([...tiles.values()].some((t) => !t)) {
    const fk = need(fz)
    await Promise.all([...fk].map(async (k) => {
      const [x, y] = k.split('/').map(Number)
      fallback.set(k, await loadTile(req.base, fz, x, y))
    }))
  }

  // Numeric tile keys + "same tile as the previous pixel" shortcut: neighbouring
  // pixels almost always share a tile, so the Map lookup is rarely hit.
  const tileByNum = new Map<number, Float32Array | null>()
  for (const [k, v] of tiles) { const [x, y] = k.split('/').map(Number); tileByNum.set(x * 65536 + y, v) }
  const fallbackByNum = new Map<number, Float32Array | null>()
  for (const [k, v] of fallback) { const [x, y] = k.split('/').map(Number); fallbackByNum.set(x * 65536 + y, v) }
  const sz = 2 ** z
  const span = sz * TILE
  const fsz = 2 ** fz
  let lastNum = -1
  let lastTile: Float32Array | null | undefined
  const bilinear = (t: Float32Array, lx: number, ly: number) => {
    const x0 = lx < 0 ? 0 : lx > TILE - 2 ? TILE - 2 : lx | 0
    const y0 = ly < 0 ? 0 : ly > TILE - 2 ? TILE - 2 : ly | 0
    const fx = Math.max(0, Math.min(1, lx - x0))
    const fy = Math.max(0, Math.min(1, ly - y0))
    const i = y0 * TILE + x0
    return (t[i] * (1 - fx) + t[i + 1] * fx) * (1 - fy) + (t[i + TILE] * (1 - fx) + t[i + TILE + 1] * fx) * fy
  }
  const sample = (lo: number, la: number) => {
    let px = mercX(lo, z) - 0.5
    let py = mercY(la, z) - 0.5
    px = ((px % span) + span) % span
    py = py < 0 ? 0 : py > span - 1 ? span - 1 : py
    const tx = (px / TILE) | 0
    const ty = (py / TILE) | 0
    const num = tx * 65536 + ty
    if (num !== lastNum) { lastNum = num; lastTile = tileByNum.get(num) }
    if (lastTile) return bilinear(lastTile, px - tx * TILE, py - ty * TILE)
    const fx = mercX(lo, fz) - 0.5
    const fy = Math.max(0, Math.min(fsz * TILE - 1, mercY(la, fz) - 0.5))
    const ftx = ((fx / TILE) | 0) % fsz
    const fty = (fy / TILE) | 0
    const ft = fallbackByNum.get(ftx * 65536 + fty)
    return ft ? bilinear(ft, fx - ((fx / TILE) | 0) * TILE, fy - fty * TILE) : 0
  }

  // 3. elevations
  const elev = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) if (valid[i]) elev[i] = sample(lon[i], lat[i])

  // 4. land mask from the vector coastline (antialiased), lakes punched out
  const canvas = new OffscreenCanvas(W, H)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  let mask: Uint8ClampedArray | null = null
  if (water) {
    projection.clipExtent([[-10, -10], [W + 10, H + 10]])
    const path = geoPath(projection, ctx as unknown as CanvasRenderingContext2D)
    ctx.fillStyle = '#fff'
    ctx.beginPath(); path(water.land); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath(); path(water.lakes); ctx.fill()
    mask = ctx.getImageData(0, 0, W, H).data
    ctx.clearRect(0, 0, W, H)
  }

  // 5. hillshade + colour
  const pal = req.palette
  const landLut = ramp(pal.land, -500, 7000)
  const seaLut = ramp(pal.sea.map(([d, c]) => [-d, c] as Stop), 0, 11000)
  const shadow = rgb(pal.shadow)
  const high = rgb(pal.highlight)
  // Light from the upper-left of the screen, 42° above the horizon.
  const alt = (42 * Math.PI) / 180
  const lxy = Math.cos(alt) / Math.SQRT2
  const flat = Math.sin(alt)
  // Small-scale maps need more vertical exaggeration to read at all.
  const zf = req.strength * Math.max(1.2, Math.min(16, (mpp / 40) ** 0.5))
  const img = ctx.createImageData(W, H)
  const out = img.data
  const cosLat = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) if (valid[i]) cosLat[i] = Math.cos((lat[i] * Math.PI) / 180)
  const dist = (a: number, b: number) => {
    const dx = (lon[b] - lon[a]) * cosLat[a]
    const dy = lat[b] - lat[a]
    return Math.max(1, Math.sqrt(dx * dx + dy * dy) * 111320)
  }
  const tint = (lut: Uint8ClampedArray, idx: number, k: number, s: number, acc: number[], w: number) => {
    let c0 = lut[idx], c1 = lut[idx + 1], c2 = lut[idx + 2]
    if (k < 0) {
      const t = Math.min(1, -k * 1.7 * s)
      c0 += (shadow[0] - c0) * t; c1 += (shadow[1] - c1) * t; c2 += (shadow[2] - c2) * t
    } else {
      const t = Math.min(1, k * 1.1 * s)
      c0 += (high[0] - c0) * t; c1 += (high[1] - c1) * t; c2 += (high[2] - c2) * t
    }
    acc[0] += c0 * w; acc[1] += c1 * w; acc[2] += c2 * w
  }
  const acc = [0, 0, 0]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!valid[i]) continue
      // Gradient over ±k pixels: k = 2 at full resolution smooths DEM interpolation noise.
      const k2 = req.resolution >= 0.75 ? 2 : 1
      const l = x >= k2 && valid[i - k2] ? i - k2 : i
      const r = x < W - k2 && valid[i + k2] ? i + k2 : i
      const u = y >= k2 && valid[i - k2 * W] ? i - k2 * W : i
      const d = y < H - k2 && valid[i + k2 * W] ? i + k2 * W : i
      const e = elev[i]
      const gx = r !== l ? ((elev[r] - elev[l]) / dist(l, r)) * zf : 0
      const gy = d !== u ? ((elev[d] - elev[u]) / dist(u, d)) * zf : 0
      // n·L with n = (−gx, −gy, 1)/|n| and L = (−lxy, −lxy, sin alt)
      const shade = Math.max(0, (gx * lxy + gy * lxy + flat) / Math.sqrt(1 + gx * gx + gy * gy))
      const k = shade - flat
      const land = mask ? mask[i * 4] / 255 : e > 0 ? 1 : 0
      acc[0] = 0; acc[1] = 0; acc[2] = 0
      if (land > 0) tint(landLut, (Math.max(-500, Math.min(7000, Math.round(Math.max(e, 0)))) + 500) * 3, k, pal.strength, acc, land)
      if (land < 1) tint(seaLut, Math.max(0, Math.min(11000, Math.round(-Math.min(e, 0)))) * 3, k, pal.strength * 0.35, acc, 1 - land)
      out[i * 4] = acc[0]; out[i * 4 + 1] = acc[1]; out[i * 4 + 2] = acc[2]; out[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  // JPEG encodes ~5× faster; the globe needs PNG for the transparent corners.
  const blob = await canvas.convertToBlob(req.spec.kind === 'globe' ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.93 })
  return { id: req.id, blob, zoom: z }
}

self.onmessage = (e: MessageEvent<ReliefRequest>) => {
  render(e.data)
    .then((res) => self.postMessage(res))
    .catch((err) => self.postMessage({ id: e.data.id, error: String(err) } satisfies ReliefResponse))
}
