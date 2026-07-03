import { BADGE3D_VIEWBOX } from './types'

const VB = BADGE3D_VIEWBOX

export type RibbonPlacement = 'none' | 'bottom' | 'sides' | 'left' | 'right'

type FlagWaveProps = {
  flagUrl: string
  /** Band vertical centre. */
  cy: number
  height: number
  amplitude: number
  waves: number
  /** Phase shift 0..1. */
  phase?: number
  idSuffix: string
  edgeColor?: string
  mirror?: boolean
}

const WAVE_SAMPLES = 96

/** Catmull-Rom interpolation through control points (t in 0..1). */
function catmullRom(points: Array<[number, number]>, t: number): number {
  const n = points.length
  const xs = points.map((p) => p[0])
  let segment = 0
  while (segment < n - 2 && t > xs[segment + 1]) {
    segment += 1
  }
  const p0 = points[Math.max(0, segment - 1)][1]
  const p1 = points[segment][1]
  const p2 = points[Math.min(n - 1, segment + 1)][1]
  const p3 = points[Math.min(n - 1, segment + 2)][1]
  const span = xs[segment + 1] - xs[segment] || 1
  const u = Math.min(1, Math.max(0, (t - xs[segment]) / span))
  const u2 = u * u
  const u3 = u2 * u
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  )
}

/**
 * Hand-authored ribbon centerlines (artist curves, not sines): asymmetric
 * rhythm — long rise, sharp dip, relaxed tail. Values in -1..1, scaled by
 * amplitude. Picked by the "waves" control (1 = classic S, 2+ = double).
 */
const AUTHORED_CURVES: Array<Array<[number, number]>> = [
  // Classic S: high left shoulder, deep center-right dip, lifted tail.
  [[0, -0.5], [0.16, 0.75], [0.4, 1.1], [0.62, -0.85], [0.84, -1.15], [1, -0.2]],
  // Double wave: two unequal crests, like cloth pinched twice.
  [[0, 0.35], [0.14, -0.95], [0.34, 0.7], [0.52, 1.15], [0.7, -0.6], [0.88, -1.05], [1, 0.1]],
]

/** Thickness profile: cloth widens in dips and tightens on crests. */
function thicknessAt(value: number): number {
  return 1 + 0.09 * value
}

/**
 * Builds a horizontal displacement map (normalized curve values encoded in
 * the green channel, red pinned to 128 so dx stays 0) for feImage.
 * feDisplacementMap samples the source at +dy, so values are inverted.
 */
function buildWaveMapFromValues(values: number[], maxAbs: number): string {
  const stops: string[] = []
  values.forEach((value, index) => {
    const t = index / (values.length - 1)
    const g = Math.round((0.5 - (0.5 * value) / maxAbs) * 255)
    stops.push(`<stop offset="${t.toFixed(4)}" stop-color="rgb(128,${g},0)"/>`)
  })
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">${stops.join('')}</linearGradient></defs>` +
    `<rect width="512" height="512" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Waving flag band: the flag is drawn once and deformed by a sine
 * displacement map (feDisplacementMap) — perfectly smooth cloth wave with
 * no slicing seams; a slope-synced overlay lights crests and shades troughs.
 */
export function FlagWaveBand({
  flagUrl,
  cy,
  height,
  amplitude,
  waves,
  phase = 0,
  idSuffix,
  edgeColor = '#e9eef5',
  mirror = false,
}: FlagWaveProps) {
  const curve = AUTHORED_CURVES[waves >= 2 ? 1 : 0]
  const offsets: number[] = []
  const normValues: number[] = []
  for (let index = 0; index <= WAVE_SAMPLES; index += 1) {
    const t = index / WAVE_SAMPLES
    const value = catmullRom(curve, (t + phase) % 1)
    normValues.push(value)
    offsets.push(value * amplitude)
  }
  const shadeId = `frw-shade-${idSuffix}`
  const sheenId = `frw-sheen-${idSuffix}`
  const volumeId = `frw-volume-${idSuffix}`
  const clothId = `frw-cloth-${idSuffix}`
  const filterId = `frw-disp-${idSuffix}`
  const stepX = VB / WAVE_SAMPLES
  const maxAbs = Math.max(...normValues.map((v) => Math.abs(v)), 0.001)
  // Edges follow the authored curve with a varying cloth thickness.
  const edgeTop: string[] = []
  const edgeBottom: string[] = []
  offsets.forEach((offset, index) => {
    const x = index * stepX
    const th = (height * thicknessAt(normValues[index])) / 2
    edgeTop.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy - th + offset}`)
    edgeBottom.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy + th + offset}`)
  })
  const pad = amplitude * maxAbs + height * 0.1 + 4
  const lastTh = (height * thicknessAt(normValues[WAVE_SAMPLES])) / 2
  // Closed band outline reused by shadow / overlays / texture clip.
  const bandPath =
    `${edgeTop.join(' ')} L ${VB} ${cy + lastTh + offsets[WAVE_SAMPLES]} ` +
    `${edgeBottom.slice().reverse().map((cmd) => cmd.replace(/^[ML]/, 'L')).join(' ')} Z`
  // Normalized curve values (for crest-synced satin sheen and fold accents).
  const sines = normValues.map((v) => v / maxAbs)
  // Local extrema of the centerline — where the artist would bake fold accents.
  const extrema: Array<{ x: number; y: number; type: 'crest' | 'dip' }> = []
  for (let index = 2; index < WAVE_SAMPLES - 1; index += 1) {
    const prev = offsets[index - 1]
    const cur = offsets[index]
    const next = offsets[index + 1]
    if (cur < prev && cur <= next) {
      extrema.push({ x: index * stepX, y: cy + cur, type: 'crest' })
    } else if (cur > prev && cur >= next) {
      extrema.push({ x: index * stepX, y: cy + cur, type: 'dip' })
    }
  }

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0">
          {offsets.map((offset, index) => {
            if (index % 2 !== 0 && index !== WAVE_SAMPLES) {
              return null
            }
            const t = index / WAVE_SAMPLES
            const next = offsets[Math.min(index + 1, WAVE_SAMPLES)]
            const slope = (next - offset) / stepX
            const light = Math.max(-0.3, Math.min(0.3, -slope * 1.4))
            const color = light >= 0
              ? `rgba(255,255,255,${(light * 0.4).toFixed(3)})`
              : `rgba(8,16,32,${(-light * 0.45).toFixed(3)})`
            return <stop key={index} offset={t} stopColor={color} />
          })}
        </linearGradient>
        {/* Satin sheen: bright bands exactly on wave crests. */}
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
          {sines.map((value, index) => {
            if (index % 2 !== 0 && index !== WAVE_SAMPLES) {
              return null
            }
            const t = index / WAVE_SAMPLES
            const crest = Math.max(0, value)
            const alpha = (crest * crest * 0.14).toFixed(3)
            return <stop key={index} offset={t} stopColor={`rgba(255,255,255,${alpha})`} />
          })}
        </linearGradient>
        {/* Vertical volume: lit top edge, occluded bottom edge. */}
        <linearGradient id={volumeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.3" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#08101f" stopOpacity="0" />
          <stop offset="1" stopColor="#08101f" stopOpacity="0.16" />
        </linearGradient>
        {/* Woven cloth texture, clipped to the band. */}
        <filter id={clothId} filterUnits="userSpaceOnUse" x={-8} y={cy - height / 2 - pad} width={VB + 16} height={height + pad * 2}>
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
          <feComponentTransfer in="gray" result="soft">
            <feFuncA type="linear" slope="0.5" intercept="0" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceAlpha" operator="in" />
        </filter>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x={-8}
          y={cy - height / 2 - pad}
          width={VB + 16}
          height={height + pad * 2}
        >
          <feImage
            href={buildWaveMapFromValues(normValues, maxAbs)}
            x={0}
            y={cy - height / 2 - pad}
            width={VB}
            height={height + pad * 2}
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={amplitude * maxAbs * 2}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      {/* Soft shadow the cloth casts on the badge. */}
      <path d={bandPath} fill="#020a14" opacity="0.4" transform="translate(0 7)" style={{ filter: 'blur(6px)' }} />
      {/* The flag, deformed as one piece of cloth. */}
      <g filter={`url(#${filterId})`}>
        <image
          href={flagUrl}
          x={0}
          y={cy - height / 2}
          width={VB}
          height={height}
          preserveAspectRatio="none"
        />
      </g>
      {/* Wave shading synced to the same sine. */}
      <path d={bandPath} fill={`url(#${shadeId})`} />
      {/* Satin crest sheen (screen-like additive white). */}
      <path d={bandPath} fill={`url(#${sheenId})`} />
      {/* Vertical cloth volume. */}
      <path d={bandPath} fill={`url(#${volumeId})`} />
      {/* Woven texture. */}
      <path d={bandPath} fill="#ffffff" filter={`url(#${clothId})`} opacity="0.025" style={{ mixBlendMode: 'overlay' }} />
      {/* Baked fold accents at curve extrema: soft highlight on crests,
          soft occlusion in dips — the hand-drawn ribbon look. */}
      <g style={{ mixBlendMode: 'soft-light' }}>
        {extrema.map((point, index) => (
          <ellipse
            key={index}
            cx={point.x}
            cy={point.y}
            rx={height * 1.1}
            ry={height * 0.62}
            fill={point.type === 'crest' ? '#ffffff' : '#0a1526'}
            opacity={point.type === 'crest' ? 0.5 : 0.4}
            style={{ filter: 'blur(10px)' }}
          />
        ))}
      </g>
      {/* Edge accents: dark seam + thin metal highlight. */}
      <path d={edgeTop.join(' ')} fill="none" stroke="#0a1526" strokeWidth={2.6} strokeOpacity={0.65} />
      <path d={edgeBottom.join(' ')} fill="none" stroke="#0a1526" strokeWidth={2.6} strokeOpacity={0.65} />
      <path d={edgeTop.join(' ')} fill="none" stroke={edgeColor} strokeWidth={1.1} strokeOpacity={0.7} transform="translate(0 -1.6)" />
      <path d={edgeBottom.join(' ')} fill="none" stroke={edgeColor} strokeWidth={1.1} strokeOpacity={0.7} transform="translate(0 1.6)" />
    </g>
  )
}

type SideRibbonProps = {
  flagUrl: string
  side: 'left' | 'right'
  idSuffix: string
  edgeColor?: string
}

/**
 * Side ribbon: a folded band flowing from behind the badge edge downwards,
 * with a swallowtail cut. Drawn as three segments (back tail, fold, front),
 * flag artwork stretched along the front segment.
 */
export function SideRibbon({ flagUrl, side, idSuffix, edgeColor = '#e9eef5' }: SideRibbonProps) {
  const mirror = side === 'right'
  const shadeId = `srb-shade-${idSuffix}`
  const foldId = `srb-fold-${idSuffix}`
  const clothId = `srb-cloth-${idSuffix}`
  const clipId = `srb-clip-${idSuffix}`
  // Geometry authored for the left side, mirrored for the right: the band
  // emerges from behind the frame, folds over, flows down with a slight
  // S-curve and ends in a swallowtail.
  const frontPath =
    'M 16 296 C 40 322 58 344 68 386 C 72 404 72 424 68 446 L 62 476 L 96 456 L 122 492 ' +
    'C 118 458 112 424 100 392 C 88 360 70 330 48 308 Z'
  const backPath = 'M 16 296 L 48 308 L 34 276 Z'
  const foldPath = 'M 16 296 C 30 306 40 310 48 308 L 40 292 Z'

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        {/* Light from upper-left along the band. */}
        <linearGradient id={shadeId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="0.62" stopColor="rgba(8,16,32,0.1)" />
          <stop offset="0.82" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="1" stopColor="rgba(8,16,32,0.42)" />
        </linearGradient>
        <linearGradient id={foldId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(8,16,32,0.75)" />
          <stop offset="1" stopColor="rgba(8,16,32,0.25)" />
        </linearGradient>
        <filter id={clothId} filterUnits="userSpaceOnUse" x={0} y={260} width={140} height={250}>
          <feTurbulence type="fractalNoise" baseFrequency="0.35 0.02" numOctaves="2" seed="11" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
          <feComponentTransfer in="gray" result="soft">
            <feFuncA type="linear" slope="0.5" intercept="0" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceAlpha" operator="in" />
        </filter>
        <clipPath id={clipId}>
          <path d={frontPath} />
        </clipPath>
      </defs>
      {/* Shadow the ribbon casts on whatever is behind it. */}
      <path d={frontPath} fill="#020a14" opacity="0.38" transform="translate(5 7)" style={{ filter: 'blur(5px)' }} />
      {/* Back fold tucked behind the frame. */}
      <path d={backPath} fill="#0a1526" opacity={0.9} />
      {/* Front band with flag artwork flowing along it. */}
      <g clipPath={`url(#${clipId})`}>
        <image href={flagUrl} x={-52} y={270} width={240} height={240} preserveAspectRatio="xMidYMid slice" transform="rotate(28 70 386)" />
        <path d={frontPath} fill={`url(#${shadeId})`} />
        {/* Cloth texture. */}
        <path d={frontPath} fill="#ffffff" filter={`url(#${clothId})`} opacity="0.06" style={{ mixBlendMode: 'overlay' }} />
        {/* Swallowtail inner crease. */}
        <path d="M 62 476 L 96 456" stroke="rgba(8,16,32,0.5)" strokeWidth="2.5" fill="none" />
      </g>
      {/* Fold highlight where the band turns over. */}
      <path d={foldPath} fill={`url(#${foldId})`} />
      {/* Edge treatment: dark seam + thin highlight. */}
      <path d={frontPath} fill="none" stroke="#0a1526" strokeWidth={2.2} strokeOpacity={0.6} />
      <path d={frontPath} fill="none" stroke={edgeColor} strokeWidth={1} strokeOpacity={0.65} />
    </g>
  )
}

