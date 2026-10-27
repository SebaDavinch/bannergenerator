import { memo, useMemo } from 'react'
import { geoBounds, geoCircle, geoContains, geoPath } from 'd3-geo'
import { useAirportDb } from '../data/airports'
import { useVatsimDb } from '../data/vatsim'
import { rng } from '../lib/rng'
import { radarProjection, type Box } from '../map/projection'

const W = 1920
const H = 1080
const TYPES = ['B738', 'A321', 'A320', 'B77W', 'A21N', 'E190', 'B739', 'A333', 'SU95']

/**
 * Real VATSIM sector rendered as a modern ATC display: FIR boundary + its
 * sub-sectors (VATSpy), neighbouring FIRs, airports inside the FIR, range
 * rings from the main field, and seeded VA traffic with datablocks.
 */
export const RadarScene = memo(function RadarScene({ fir, sectors, traffic, seed, rings, accent, callsign }: {
  fir: string; sectors: boolean; traffic: number; seed: number; rings: boolean; accent: string; callsign: string
}) {
  const vatsim = useVatsimDb()
  const airports = useAirportDb()

  const scene = useMemo(() => {
    if (!vatsim) return null
    const shape = vatsim.shapes.get(fir) ?? null
    const meta = vatsim.firById.get(fir)
    if (!shape || !meta) return null
    const box: Box = [[880, 120], [1830, 960]]
    const center = meta.label
    const projection = radarProjection(center, shape, box)
    projection.clipExtent([[-20, -20], [W + 20, H + 20]])
    const path = geoPath(projection)
    const neighbours: string[] = []
    for (const f of vatsim.firs) {
      if (f.sector || f.id === fir) continue
      if (Math.abs(f.label[0] - center[0]) > 40 || Math.abs(f.label[1] - center[1]) > 25) continue
      const g = vatsim.shapes.get(f.id)
      const d = g && path(g)
      if (d) neighbours.push(d)
    }
    const sectorPaths = sectors
      ? vatsim.firs.filter((f) => f.parent === fir).map((f) => path(vatsim.shapes.get(f.id)!) ?? '').filter(Boolean)
      : []

    const fields = airports
      ? Object.entries(vatsim.airportFir)
        .filter(([, f]) => f === fir || f.startsWith(`${fir}-`))
        .map(([icao]) => airports.byIcao.get(icao))
        .filter((a): a is NonNullable<typeof a> => !!a && a.size !== 'S' && geoContains(shape, [a.lon, a.lat]))
        .sort((a, b) => (b.network ? 1 : 0) - (a.network ? 1 : 0) || (a.size === 'L' ? -1 : 1) - (b.size === 'L' ? -1 : 1))
        .slice(0, 16)
      : []
    const main = fields[0]
    const ringCenter: [number, number] = main ? [main.lon, main.lat] : center
    const ringPaths = rings ? [25, 50, 100, 150].map((nm) => ({ nm, d: path(geoCircle().center(ringCenter).radius(nm / 60).precision(3)()) ?? '' })) : []
    const ringOrigin = projection(ringCenter)

    // Seeded traffic inside the FIR polygon.
    const r = rng(seed)
    const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(shape)
    const targets: { x: number; y: number; hdg: number; cs: string; fl: number; gs: number; type: string; va: boolean }[] = []
    let guard = 0
    while (targets.length < traffic && guard++ < 4000) {
      const lon = minLon + r() * (maxLon - minLon)
      const lat = minLat + r() * (maxLat - minLat)
      if (!geoContains(shape, [lon, lat])) continue
      const p = projection([lon, lat])
      if (!p || p[0] < 900 || p[0] > 1800 || p[1] < 150 || p[1] > 930) continue
      if (targets.some((t) => Math.hypot(t.x - p[0], t.y - p[1]) < 120)) continue
      const va = targets.length % 3 !== 2
      targets.push({
        x: p[0], y: p[1], hdg: r() * 360,
        cs: va ? `${callsign}${Math.floor(100 + r() * 8900)}` : ['AFL', 'SDM', 'SVR', 'UTA', 'THY'][Math.floor(r() * 5)] + Math.floor(100 + r() * 900),
        fl: Math.round(180 + r() * 210), gs: Math.round(380 + r() * 110), type: TYPES[Math.floor(r() * TYPES.length)], va,
      })
    }
    return {
      fir: path(shape) ?? '', neighbours, sectorPaths, ringPaths, ringOrigin, targets, meta,
      fields: fields.map((a) => ({ a, p: projection([a.lon, a.lat]) })).filter((f) => f.p),
    }
  }, [vatsim, airports, fir, sectors, traffic, seed, rings, callsign])

  const line = 'rgba(120,214,226,.85)'
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id="rd-bg" cx="0.68" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#0d1b22" />
          <stop offset="1" stopColor="#04080b" />
        </radialGradient>
        <radialGradient id="rd-sweep" cx="0" cy="0" r="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={line} stopOpacity="0.0" />
          <stop offset="1" stopColor={line} stopOpacity="0.14" />
        </radialGradient>
        <filter id="rd-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4" /></filter>
        <pattern id="rd-scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="rgba(255,255,255,.018)" /></pattern>
      </defs>
      <rect width={W} height={H} fill="url(#rd-bg)" />
      {scene && (
        <>
          {scene.neighbours.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(120,214,226,.13)" strokeWidth={1.4} />)}
          <path d={scene.fir} fill="rgba(120,214,226,.045)" />
          {scene.sectorPaths.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(120,214,226,.28)" strokeWidth={1.3} strokeDasharray="8 6" />)}
          {scene.ringPaths.map((rp) => <path key={rp.nm} d={rp.d} fill="none" stroke="rgba(160,200,210,.16)" strokeWidth={1.4} />)}
          {scene.ringOrigin && scene.ringPaths.map((rp) => {
            const d = rp.d.match(/M([\d.-]+),([\d.-]+)/)
            return d ? <text key={`t${rp.nm}`} x={Number(d[1]) + 6} y={Number(d[2]) - 6} fill="rgba(160,200,210,.45)" fontSize={16} fontFamily="JetBrains Mono">{rp.nm}</text> : null
          })}
          {scene.ringOrigin && (
            <g transform={`translate(${scene.ringOrigin[0]} ${scene.ringOrigin[1]})`}>
              {Array.from({ length: 14 }, (_, i) => (
                <path key={i} d={`M0,0 L${Math.cos((-60 + i * 2.4) * Math.PI / 180) * 900},${Math.sin((-60 + i * 2.4) * Math.PI / 180) * 900} A900,900 0 0 1 ${Math.cos((-57.6 + i * 2.4) * Math.PI / 180) * 900},${Math.sin((-57.6 + i * 2.4) * Math.PI / 180) * 900} Z`}
                  fill={line} opacity={0.004 + i * 0.0045} />
              ))}
            </g>
          )}
          <path d={scene.fir} fill="none" stroke={line} strokeWidth={6} opacity={0.35} filter="url(#rd-glow)" />
          <path d={scene.fir} fill="none" stroke={line} strokeWidth={2.4} />
          {scene.fields.map(({ a, p }) => (
            <g key={a.icao} transform={`translate(${p![0]} ${p![1]})`}>
              <rect x={-6} y={-6} width={12} height={12} fill="none" stroke="rgba(220,235,240,.8)" strokeWidth={2} transform="rotate(45)" />
              <text x={12} y={6} fill="rgba(220,235,240,.72)" fontSize={18} fontFamily="JetBrains Mono" fontWeight={600}>{a.icao}</text>
            </g>
          ))}
          {scene.targets.map((t, i) => {
            const rad = (t.hdg - 90) * (Math.PI / 180)
            const color = t.va ? accent : '#9ff3d6'
            const vx = Math.cos(rad) * 60
            const vy = Math.sin(rad) * 60
            const side = vx > 0 ? -1 : 1
            return (
              <g key={i} transform={`translate(${t.x} ${t.y})`}>
                {[1, 2, 3, 4, 5].map((k) => <circle key={k} cx={-Math.cos(rad) * k * 14} cy={-Math.sin(rad) * k * 14} r={3.4 - k * 0.4} fill={color} opacity={0.6 - k * 0.1} />)}
                <line x1={0} y1={0} x2={vx} y2={vy} stroke={color} strokeWidth={2} />
                <rect x={-7} y={-7} width={14} height={14} fill="none" stroke={color} strokeWidth={2.4} />
                <line x1={side * 12} y1={-10} x2={side * 40} y2={-34} stroke={color} strokeWidth={1.4} opacity={0.7} />
                <g transform={`translate(${side > 0 ? 44 : -44} -40)`} fontFamily="JetBrains Mono" fontWeight={700} textAnchor={side > 0 ? 'start' : 'end'}>
                  <text fill={color} fontSize={20}>{t.cs}</text>
                  <text y={22} fill={color} fontSize={17} opacity={0.85}>{String(t.fl).padStart(3, '0')} {t.gs}</text>
                  <text y={42} fill={color} fontSize={17} opacity={0.6}>{t.type}</text>
                </g>
              </g>
            )
          })}
        </>
      )}
      <rect width={W} height={H} fill="url(#rd-scan)" />
    </svg>
  )
})
