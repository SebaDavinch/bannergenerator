import { memo, useMemo } from 'react'
import { Airspeed, Altimeter, AttitudeIndicator, HeadingIndicator, TurnCoordinator, VerticalSpeed } from 'flight-indicators'
import { rng } from '../lib/rng'

/*
 * Abstract aviation backdrops for Community Goal / Challenge. Everything is
 * procedural SVG in 1920×1080 stage space and seeded, so the export matches
 * the preview pixel for pixel.
 */

const W = 1920
const H = 1080

function Stars({ seed, count = 140, maxY = H, minX = 0 }: { seed: number; count?: number; maxY?: number; minX?: number }) {
  const stars = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({ x: minX + r() * (W - minX), y: r() * maxY, s: r() ** 3 * 2.2 + 0.4, o: 0.2 + r() * 0.6 }))
  }, [seed, count, maxY, minX])
  return <g>{stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} />)}</g>
}

export interface Lane { color: string; label: string }

/** Parallel runways at dusk seen from short final, one per team, with approach and edge lighting. */
export const RunwayScene = memo(function RunwayScene({ lanes, seed }: { lanes: Lane[]; seed: number }) {
  const V = { x: 1330, y: 452 }
  const n = Math.max(1, Math.min(4, lanes.length))
  const proj = (X: number, z: number) => {
    const s = 1 / (1 + z * 0.32)
    return { x: V.x + (X - V.x) * s, y: V.y + (H + 180 - V.y) * s, s }
  }
  const width = n > 2 ? 420 : 560
  const gap = n > 2 ? 300 : 520
  const items = Array.from({ length: n }, (_, i) => {
    const cx = V.x + (i - (n - 1) / 2) * (width + gap) + 260
    return { cx, lane: lanes[i] ?? { color: '#fff', label: '' } }
  })
  const zThr = 2.2
  const zEnd = 60
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="rw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a14" />
          <stop offset="0.36" stopColor="#0d1a2e" />
          <stop offset="0.418" stopColor="#3a2a3c" />
          <stop offset="0.42" stopColor="#0b0f17" />
          <stop offset="1" stopColor="#05070b" />
        </linearGradient>
        <radialGradient id="rw-glow" cx={V.x / W} cy={V.y / H} r="0.5">
          <stop offset="0" stopColor="#ffb27a" stopOpacity="0.38" />
          <stop offset="0.3" stopColor="#ff6a4d" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ff6a4d" stopOpacity="0" />
        </radialGradient>
        <filter id="rw-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="rw-haze"><feGaussianBlur stdDeviation="22" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#rw-sky)" />
      <Stars seed={seed} count={120} maxY={V.y - 40} minX={500} />
      <rect width={W} height={H} fill="url(#rw-glow)" />
      <rect x={0} y={V.y - 3} width={W} height={6} fill="#ffcf9e" opacity={0.18} filter="url(#rw-haze)" />
      {items.map(({ cx, lane }, li) => {
        const hw = width / 2
        const a = proj(cx - hw, zThr)
        const b = proj(cx + hw, zThr)
        const c = proj(cx + hw, zEnd)
        const d = proj(cx - hw, zEnd)
        const edges: { x: number; y: number; r: number }[] = []
        for (let z = zThr; z < zEnd; z += 1.1) {
          for (const side of [-1, 1]) {
            const p = proj(cx + side * (hw + 6), z)
            edges.push({ x: p.x, y: p.y, r: Math.max(0.8, 7 * p.s) })
          }
        }
        const center: string[] = []
        for (let z = zThr + 1.2; z < zEnd; z += 1.6) {
          const p1 = proj(cx, z)
          const p2 = proj(cx, z + 0.8)
          center.push(`M${p1.x},${p1.y}L${p2.x},${p2.y}`)
        }
        const keys: string[] = []
        for (let k = 0; k < 8; k++) {
          const off = (k < 4 ? -hw + 30 + k * 40 : hw - 30 - (7 - k) * 40)
          const p1 = proj(cx + off - 12, zThr + 0.15)
          const p2 = proj(cx + off + 12, zThr + 0.15)
          const p3 = proj(cx + off + 12, zThr + 1)
          const p4 = proj(cx + off - 12, zThr + 1)
          keys.push(`M${p1.x},${p1.y}L${p2.x},${p2.y}L${p3.x},${p3.y}L${p4.x},${p4.y}Z`)
        }
        const als: { x1: number; x2: number; y: number; s: number }[] = []
        for (let z = 0.15; z < zThr - 0.1; z += 0.34) {
          const p1 = proj(cx - 120, z)
          const p2 = proj(cx + 120, z)
          als.push({ x1: p1.x, x2: p2.x, y: p1.y, s: p1.s })
        }
        const label = proj(cx, zThr + 1.6)
        return (
          <g key={li}>
            <path d={`M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}L${d.x},${d.y}Z`} fill="#11151d" stroke="rgba(255,255,255,.05)" />
            <path d={keys.join('')} fill="#d8dde6" opacity={0.75} />
            <path d={center.join('')} stroke="#e8ecf2" strokeWidth={6} opacity={0.5} />
            <g filter="url(#rw-bloom)">
              {edges.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r={e.r * 2.2} fill={lane.color} opacity={0.55} />)}
              {als.map((l, i) => <line key={i} x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} stroke="#fff4d6" strokeWidth={10 * l.s} opacity={0.6} />)}
            </g>
            {edges.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r={e.r} fill="#fffaf0" />)}
            {als.map((l, i) => <line key={i} x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} stroke="#fffbe9" strokeWidth={4 * l.s} strokeDasharray={`${14 * l.s} ${10 * l.s}`} />)}
            <text x={label.x} y={label.y} textAnchor="middle" fill={lane.color} fontFamily="Oswald" fontWeight={700}
              fontSize={150 * label.s} transform={`translate(${label.x} ${label.y}) scale(1 .42) translate(${-label.x} ${-label.y})`} opacity={0.92}>
              {lane.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

/** Stacked holding patterns over a fix — one racetrack per team. */
export const HoldingScene = memo(function HoldingScene({ tracks, seed, fix = 'NORDW' }: { tracks: Lane[]; seed: number; fix?: string }) {
  const C = { x: 1330, y: 540 }
  const r = rng(seed)
  const course = 250 + Math.round(r() * 40)
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)
  const n = Math.max(1, tracks.length)
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id="hd-bg" cx="0.7" cy="0.5" r="0.75">
          <stop offset="0" stopColor="#101b2c" />
          <stop offset="1" stopColor="#05080e" />
        </radialGradient>
        <pattern id="hd-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="rgba(150,180,220,.06)" strokeWidth="1" />
        </pattern>
        <filter id="hd-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#hd-bg)" />
      <rect width={W} height={H} fill="url(#hd-grid)" />
      <g transform={`translate(${C.x} ${C.y})`}>
        {[460, 330, 200].map((rad) => <circle key={rad} r={rad} fill="none" stroke="rgba(160,190,230,.12)" strokeWidth={1.5} strokeDasharray={rad === 460 ? undefined : '4 8'} />)}
        {ticks.map((deg) => {
          const long = deg % 30 === 0
          const a = (deg - 90) * (Math.PI / 180)
          const r1 = 460
          const r2 = long ? 438 : 450
          return <line key={deg} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke="rgba(190,210,240,.4)" strokeWidth={long ? 2.5 : 1.2} />
        })}
        {ticks.filter((d) => d % 30 === 0).map((deg) => {
          const a = (deg - 90) * (Math.PI / 180)
          return <text key={deg} x={Math.cos(a) * 408} y={Math.sin(a) * 408 + 8} textAnchor="middle" fill="rgba(200,215,240,.55)" fontSize={22} fontFamily="JetBrains Mono">{String(deg / 10).padStart(2, '0')}</text>
        })}
        <g transform={`rotate(${course - 90})`}>
          {tracks.map((t, i) => {
            const off = (i - (n - 1) / 2) * 34
            const len = 420
            const rad = 92 + i * 6
            const d = `M0,${off} L${-len},${off} A${rad},${rad} 0 0 1 ${-len},${off + rad * 2} L0,${off + rad * 2} A${rad},${rad} 0 0 1 0,${off}`
            const prog = 0.15 + r() * 0.7
            const ax = -len * prog
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={t.color} strokeWidth={10} opacity={0.35} filter="url(#hd-glow)" />
                <path d={d} fill="none" stroke={t.color} strokeWidth={3.5} strokeDasharray={i % 2 ? '18 10' : undefined} />
                <g transform={`translate(${ax} ${off}) rotate(180)`}>
                  <path d="M-18,-14 L22,0 L-18,14 L-8,0 Z" fill={t.color} />
                </g>
              </g>
            )
          })}
        </g>
        <path d="M0,-26 L23,14 L-23,14 Z" fill="#05080e" stroke="#fff" strokeWidth={3} />
        <text x={36} y={-24} fill="#fff" fontFamily="JetBrains Mono" fontWeight={700} fontSize={30}>{fix}</text>
        <text x={36} y={8} fill="rgba(200,215,240,.6)" fontFamily="JetBrains Mono" fontSize={20}>HOLD {String(course).padStart(3, '0')}° · 1 MIN</text>
        {tracks.map((t, i) => (
          <g key={i} transform={`translate(36 ${40 + i * 40})`}>
            <rect width={112} height={32} rx={6} fill="rgba(5,8,14,.85)" stroke={t.color} strokeWidth={2} />
            <text x={56} y={23} textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontSize={20} fontWeight={700}>FL{110 + 10 * (n - 1 - i)}</text>
            <text x={126} y={23} fill={t.color} fontFamily="Oswald" fontWeight={600} fontSize={22} letterSpacing="0.08em">{t.label}</text>
          </g>
        ))}
      </g>
    </svg>
  )
})

const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-·'

function FlapText({ text, x, y, cell = 38, color = '#f5f2e8', len }: { text: string; x: number; y: number; cell?: number; color?: string; len: number }) {
  const chars = text.toUpperCase().padEnd(len, ' ').slice(0, len).split('')
  const h = cell * 1.4
  return (
    <g transform={`translate(${x} ${y})`}>
      {chars.map((ch, i) => (
        <g key={i} transform={`translate(${i * (cell + 4)} 0)`}>
          <rect width={cell} height={h} rx={4} fill="#14161b" />
          <rect width={cell} height={h / 2} rx={4} fill="#1b1e25" />
          <line x1={0} x2={cell} y1={h / 2} y2={h / 2} stroke="#050608" strokeWidth={2} />
          <text x={cell / 2} y={h * 0.72} textAnchor="middle" fill={color} fontFamily="JetBrains Mono" fontWeight={700} fontSize={cell * 0.95}>
            {FLAP_CHARS.includes(ch) ? ch : ch}
          </text>
        </g>
      ))}
    </g>
  )
}

export interface BoardRow { time: string; flight: string; dest: string; status: string; color?: string }

/** Split-flap departures board. */
export const BoardScene = memo(function BoardScene({ rows, title = 'DEPARTURES', big, compact }: { rows: BoardRow[]; title?: string; big?: string; compact?: boolean }) {
  // Compact drops the TIME column so the board fits right of the team cards.
  const x0 = compact ? 1190 : 930
  const cell = 24
  const step = cell + 4
  const cols = { time: compact ? 0 : 5, flight: 7, dest: compact ? 9 : 11, status: compact ? 7 : 8 }
  const top = big ? 380 : 250
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="bd-bg" x1="0" x2="1">
          <stop offset="0" stopColor="#07090d" />
          <stop offset="1" stopColor="#11141a" />
        </linearGradient>
        <radialGradient id="bd-light" cx="0.72" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#ffe7b8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffe7b8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bd-bg)" />
      <rect width={W} height={H} fill="url(#bd-light)" />
      <rect x={x0 - 30} y={big ? 120 : 170} width={W - x0 - 60} height={big ? 800 : 700} rx={18} fill="#0a0c10" stroke="rgba(255,255,255,.06)" strokeWidth={2} />
      {big && <FlapText text={big} x={x0} y={150} cell={Math.min(110, 820 / Math.max(4, big.length) - 6)} len={Math.min(7, big.length)} color="#ffd36b" />}
      <text x={x0} y={top - 38} fill="#ffd36b" fontFamily="Oswald" fontWeight={600} fontSize={28} letterSpacing="0.3em">{title}</text>
      {['TIME', 'FLIGHT', 'DESTINATION', 'STATUS'].map((h, i) => {
        if (compact && i === 0) return null
        const t0 = compact ? -1 : 0
        const off = [0, cols.time + 1 + t0, cols.time + cols.flight + 2 + t0, cols.time + cols.flight + cols.dest + 3 + t0][i]
        return <text key={h} x={x0 + off * step} y={top - 6} fill="rgba(255,255,255,.4)" fontFamily="Inter" fontWeight={600} fontSize={14} letterSpacing="0.2em">{h}</text>
      })}
      {rows.slice(0, big ? 9 : 13).map((r, i) => {
        const y = top + 10 + i * (cell * 1.4 + 10)
        return (
          <g key={i}>
            {!compact && <FlapText text={r.time} x={x0} y={y} cell={cell} len={cols.time} />}
            <FlapText text={r.flight} x={x0 + (cols.time + (compact ? 0 : 1)) * step} y={y} cell={cell} len={cols.flight} color={r.color ?? '#f5f2e8'} />
            <FlapText text={r.dest} x={x0 + (cols.time + cols.flight + (compact ? 1 : 2)) * step} y={y} cell={cell} len={cols.dest} />
            <FlapText text={r.status} x={x0 + (cols.time + cols.flight + cols.dest + (compact ? 2 : 3)) * step} y={y} cell={cell} len={cols.status} color={r.color ?? '#7dffa8'} />
          </g>
        )
      })}
    </svg>
  )
})

/** Converging contrails at altitude — abstract "everyone flies to one goal". */
export const ContrailsScene = memo(function ContrailsScene({ colors, seed, count = 9 }: { colors: string[]; seed: number; count?: number }) {
  const r = rng(seed)
  const F = { x: 1480, y: 420 }
  const trails = Array.from({ length: count }, (_, i) => {
    const ang = (-200 + (i / Math.max(1, count - 1)) * 150 + (r() - 0.5) * 14) * (Math.PI / 180)
    const dist = 1500 + r() * 400
    const sx = F.x + Math.cos(ang) * dist
    const sy = F.y - Math.sin(ang) * dist * 0.62
    const ex = F.x + Math.cos(ang) * (60 + r() * 90)
    const ey = F.y - Math.sin(ang) * (40 + r() * 60)
    const c1x = sx + (ex - sx) * 0.35 + (r() - 0.5) * 300
    const c1y = sy + (ey - sy) * 0.2 + (r() - 0.5) * 200
    const color = colors[i % colors.length]
    const head = Math.atan2(ey - c1y, ex - c1x) * (180 / Math.PI)
    return { d: `M${sx},${sy} Q${c1x},${c1y} ${ex},${ey}`, sx, sy, ex, ey, color, head, w: 3 + r() * 5 }
  })
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="ct-sky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#040713" />
          <stop offset="0.6" stopColor="#0c1730" />
          <stop offset="1" stopColor="#1b1d33" />
        </linearGradient>
        <radialGradient id="ct-focus" cx={F.x / W} cy={F.y / H} r="0.35">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {trails.map((t, i) => (
          <linearGradient key={i} id={`ct-g${i}`} gradientUnits="userSpaceOnUse" x1={t.sx} y1={t.sy} x2={t.ex} y2={t.ey}>
            <stop offset="0" stopColor={t.color} stopOpacity="0" />
            <stop offset="0.7" stopColor={t.color} stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
          </linearGradient>
        ))}
        <filter id="ct-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#ct-sky)" />
      <Stars seed={seed + 3} count={180} />
      <rect width={W} height={H} fill="url(#ct-focus)" />
      {[640, 420, 230].map((rad, i) => <ellipse key={rad} cx={F.x} cy={F.y} rx={rad} ry={rad * 0.62} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={2} strokeDasharray={i ? '3 12' : undefined} />)}
      {trails.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke={`url(#ct-g${i})`} strokeWidth={t.w * 5} filter="url(#ct-soft)" opacity={0.6} strokeLinecap="round" />
          <path d={t.d} fill="none" stroke={`url(#ct-g${i})`} strokeWidth={t.w} strokeLinecap="round" />
          <g transform={`translate(${t.ex} ${t.ey}) rotate(${t.head})`}>
            <path d="M14,0 L-10,-9 L-5,0 L-10,9 Z" fill="#fff" />
          </g>
        </g>
      ))}
      <circle cx={F.x} cy={F.y} r={9} fill="#fff" />
      <circle cx={F.x} cy={F.y} r={26} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
    </svg>
  )
})

/** Jeppesen-style ILS profile + plan view abstraction. */
export const ApproachScene = memo(function ApproachScene({ icao, runway, accent }: { icao: string; runway: string; accent: string }) {
  const gx0 = 820
  const gx1 = 1850
  const ground = 810
  const thr = { x: 1760, y: ground }
  const top = { x: 980, y: 470 }
  const fixes = [
    { name: 'IF', nm: '12.0', alt: "3000'", t: 0.08 },
    { name: 'FAF', nm: '6.3', alt: "2000'", t: 0.45 },
    { name: 'D4.0', nm: '4.0', alt: "1300'", t: 0.65 },
    { name: 'MAPt', nm: '0.8', alt: "DA 270'", t: 0.93 },
  ]
  const at = (t: number) => ({ x: top.x + (thr.x - top.x) * t, y: top.y + (thr.y - top.y) * t })
  const plane = at(0.34)
  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="ap-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#070b12" />
          <stop offset="1" stopColor="#0f1724" />
        </linearGradient>
        <linearGradient id="ap-feather" x1="1" x2="0">
          <stop offset="0" stopColor={accent} stopOpacity="0.5" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <filter id="ap-glow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
        <pattern id="ap-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(200,215,240,.14)" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#ap-bg)" />
      {/* plan view */}
      <g transform="translate(60 120)">
        <path d={`M${gx1 - 80},250 L${gx0 + 40},170 L${gx0 + 40},330 Z`} fill="url(#ap-feather)" />
        <line x1={gx0 + 40} y1={250} x2={gx1 - 80} y2={250} stroke={accent} strokeWidth={3} strokeDasharray="20 10" />
        <rect x={gx1 - 80} y={238} width={70} height={24} fill="none" stroke="#fff" strokeWidth={3} />
        <text x={gx1 - 45} y={300} textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontWeight={700} fontSize={22}>{runway}</text>
        {[0.2, 0.45, 0.7].map((t) => <circle key={t} cx={gx0 + 40 + (gx1 - 120 - gx0) * t} cy={250} r={8} fill="none" stroke="#fff" strokeWidth={2.5} />)}
        <text x={gx0 + 40} y={150} fill="rgba(200,215,240,.6)" fontFamily="JetBrains Mono" fontSize={22}>ILS {runway} · {icao} · LOC 110.30 · CRS {runway.replace(/\D/g, '')}0°</text>
      </g>
      {/* profile view */}
      <rect x={gx0} y={ground} width={gx1 - gx0} height={34} fill="url(#ap-hatch)" />
      <line x1={gx0} y1={ground} x2={gx1} y2={ground} stroke="rgba(220,230,245,.7)" strokeWidth={3} />
      {fixes.map((f) => {
        const p = at(f.t)
        return (
          <g key={f.name}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={ground} stroke="rgba(200,215,240,.25)" strokeWidth={2} strokeDasharray="6 8" />
            <text x={p.x} y={ground + 66} textAnchor="middle" fill="rgba(200,215,240,.7)" fontFamily="JetBrains Mono" fontSize={22}>{f.nm}</text>
            <text x={p.x + 10} y={p.y - 18} fill="#fff" fontFamily="JetBrains Mono" fontWeight={700} fontSize={24}>{f.name}</text>
            <text x={p.x + 10} y={p.y + 10} fill="rgba(200,215,240,.6)" fontFamily="JetBrains Mono" fontSize={20}>{f.alt}</text>
          </g>
        )
      })}
      <path d={`M${top.x},${top.y} L${thr.x},${thr.y}`} stroke={accent} strokeWidth={16} opacity={0.4} filter="url(#ap-glow)" />
      <path d={`M${top.x},${top.y} L${thr.x},${thr.y}`} stroke={accent} strokeWidth={4.5} />
      <path d={`M${top.x - 120},${top.y} L${top.x},${top.y}`} stroke="#fff" strokeWidth={3} strokeDasharray="10 8" />
      <text x={top.x + 60} y={top.y - 40} textAnchor="start" fill="rgba(200,215,240,.7)" fontFamily="JetBrains Mono" fontSize={22}>GS 3.00°</text>
      <g transform={`translate(${plane.x} ${plane.y}) rotate(${Math.atan2(thr.y - top.y, thr.x - top.x) * (180 / Math.PI)})`}>
        <path d="M30,0 L-22,-16 L-12,0 L-22,16 Z" fill="#fff" />
      </g>
    </svg>
  )
})

/** Six-pack of steam gauges (flight-indicators) on a dark panel. */
export const CockpitScene = memo(function CockpitScene({ seed, accent, value }: { seed: number; accent: string; value: number }) {
  const r = rng(seed)
  const size = 250
  const gap = 24
  const x0 = 1010
  const y0 = 230
  const heading = Math.round(value % 360)
  const cells = [
    <Airspeed key="as" speed={140 + r() * 40} size={size} animationDuration={0} />,
    <AttitudeIndicator key="ai" roll={-12 + r() * 24} pitch={2 + r() * 6} size={size} animationDuration={0} />,
    <Altimeter key="alt" altitude={Math.max(1000, Math.min(99999, value * 10))} size={size} animationDuration={0} />,
    <TurnCoordinator key="tc" turnRate={-2 + r() * 4} size={size} animationDuration={0} />,
    <HeadingIndicator key="hi" heading={heading} size={size} animationDuration={0} />,
    <VerticalSpeed key="vs" verticalSpeed={300 + r() * 900} size={size} animationDuration={0} />,
  ]
  return (
    <div className="scene scene--cockpit">
      <div className="scene-cockpit__panel" style={{ left: x0 - 40, top: y0 - 40, width: 3 * size + 2 * gap + 80, height: 2 * size + gap + 80, boxShadow: `0 0 120px ${accent}22, inset 0 1px 0 rgba(255,255,255,.06)` }}>
        {cells.map((c, i) => (
          <div key={i} className="scene-cockpit__cell" style={{ left: 40 + (i % 3) * (size + gap), top: 40 + Math.floor(i / 3) * (size + gap) }}>{c}</div>
        ))}
      </div>
      <div className="scene-cockpit__vignette" />
    </div>
  )
})
