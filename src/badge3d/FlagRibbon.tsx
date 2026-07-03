import { AUTHORED_CURVES, BADGE3D_VIEWBOX } from './types'

const VB = BADGE3D_VIEWBOX

export type RibbonPlacement = 'none' | 'bottom' | 'sides' | 'left' | 'right'

import type { FlagStripe } from './flagStripes'

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
  /** Stripe structure of the flag: when set, the band is rendered as clean
      curved color stripes (the drawn-ribbon look) instead of a warped image. */
  stripes?: FlagStripe[] | null
  /** Index into AUTHORED_CURVES; takes precedence over the legacy waves knob. */
  curveIndex?: number
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

/** Thickness profile: cloth widens in dips and tightens on crests. */
function thicknessAt(value: number): number {
  return 1 + 0.09 * value
}

/** Lightens (amount > 0) or darkens (amount < 0) an "rgb(r,g,b)" string. */
function shadeColor(rgb: string, amount: number): string {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgb)
  if (!match) {
    return rgb
  }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const mix = (channel: number) => (amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount))
  const [, r, g, b] = match
  return `rgb(${clamp(mix(Number(r)))},${clamp(mix(Number(g)))},${clamp(mix(Number(b)))})`
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
  stripes = null,
  curveIndex,
}: FlagWaveProps) {
  const curve = (AUTHORED_CURVES[curveIndex ?? (waves >= 2 ? 3 : 0)] ?? AUTHORED_CURVES[0]).points
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
  // Curved stripe paths: each stripe flows between two offset curves of the
  // band, so flag colors follow the ribbon exactly (the drawn look).
  const stripePaths: Array<{ d: string; color: string; gradientId: string }> = []
  if (stripes && stripes.length > 0) {
    let cum = 0
    stripes.forEach((stripe, stripeIndex) => {
      const from = cum
      const to = cum + stripe.fraction
      cum = to
      const top: string[] = []
      const bottom: string[] = []
      offsets.forEach((offset, index) => {
        const x = index * stepX
        const th = height * thicknessAt(normValues[index])
        const bandTop = cy - th / 2 + offset
        top.push(`${index === 0 ? 'M' : 'L'} ${x} ${(bandTop + th * from).toFixed(2)}`)
        bottom.push(`${index === 0 ? 'M' : 'L'} ${x} ${(bandTop + th * to).toFixed(2)}`)
      })
      const lastThickness = height * thicknessAt(normValues[WAVE_SAMPLES])
      const lastTop = cy - lastThickness / 2 + offsets[WAVE_SAMPLES]
      stripePaths.push({
        color: stripe.color,
        gradientId: `frw-stripe-${idSuffix}-${stripeIndex}`,
        d:
          `${top.join(' ')} L ${VB} ${(lastTop + lastThickness * to).toFixed(2)} ` +
          `${bottom.slice().reverse().map((cmd) => cmd.replace(/^[ML]/, 'L')).join(' ')} Z`,
      })
    })
  }
  // Local extrema of the centerline — where a physical ribbon would crease
  // as it changes direction. Rendered as crisp diagonal fold lines (not soft
  // blur) for the faceted, gathered-fabric look of the reference art.
  const extrema: Array<{ x: number; y: number; type: 'crest' | 'dip'; angleDeg: number }> = []
  for (let index = 2; index < WAVE_SAMPLES - 1; index += 1) {
    const prev = offsets[index - 1]
    const cur = offsets[index]
    const next = offsets[index + 1]
    const isCrest = cur < prev && cur <= next
    const isDip = cur > prev && cur >= next
    if (isCrest || isDip) {
      const localSlope = (next - prev) / (2 * stepX)
      extrema.push({
        x: index * stepX,
        y: cy + cur,
        type: isCrest ? 'crest' : 'dip',
        angleDeg: Math.atan(localSlope) * (180 / Math.PI) + 90,
      })
    }
  }

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        {/* Per-stripe satin gradient: lit top edge, saturated middle, darker
            bottom edge — gives each color band real fabric volume instead
            of a flat fill. */}
        {stripePaths.map((stripe) => (
          <linearGradient key={stripe.gradientId} id={stripe.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shadeColor(stripe.color, 0.45)} />
            <stop offset="0.18" stopColor={shadeColor(stripe.color, 0.12)} />
            <stop offset="0.6" stopColor={stripe.color} />
            <stop offset="1" stopColor={shadeColor(stripe.color, -0.32)} />
          </linearGradient>
        ))}
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
            const alpha = (crest * crest * 0.2).toFixed(3)
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
      {/* Ground shadow the cloth casts on the badge — stronger separation. */}
      <path d={bandPath} fill="#020a14" opacity="0.48" transform="translate(0 9)" style={{ filter: 'blur(8px)' }} />
      {/* Flag colors: clean curved stripes with per-stripe satin shading when
          the flag structure is known, otherwise the image deformed as cloth. */}
      {stripePaths.length > 0 ? (
        <g>
          {stripePaths.map((stripe, index) => (
            <path key={index} d={stripe.d} fill={`url(#${stripe.gradientId})`} />
          ))}
        </g>
      ) : (
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
      )}
      {/* Wave shading synced to the same sine. */}
      <path d={bandPath} fill={`url(#${shadeId})`} />
      {/* Satin crest sheen (screen-like additive white). */}
      <path d={bandPath} fill={`url(#${sheenId})`} />
      {/* Vertical cloth volume. */}
      <path d={bandPath} fill={`url(#${volumeId})`} />
      {/* Woven texture. */}
      <path d={bandPath} fill="#ffffff" filter={`url(#${clothId})`} opacity="0.025" style={{ mixBlendMode: 'overlay' }} />
      {/* Crease facets at curve extrema: crisp diagonal fold lines (not soft
          blur) — a physical ribbon creases sharply where it changes
          direction, giving the faceted look of a real gathered ribbon. */}
      <g style={{ mixBlendMode: 'multiply' }} opacity={0.9}>
        {extrema.map((point, index) => {
          const th = height * thicknessAt(point.type === 'crest' ? -maxAbs : maxAbs) * 1.15
          return (
            <line
              key={index}
              x1={point.x - (th / 2) * Math.cos((point.angleDeg * Math.PI) / 180)}
              y1={point.y - (th / 2) * Math.sin((point.angleDeg * Math.PI) / 180)}
              x2={point.x + (th / 2) * Math.cos((point.angleDeg * Math.PI) / 180)}
              y2={point.y + (th / 2) * Math.sin((point.angleDeg * Math.PI) / 180)}
              stroke="#1a2438"
              strokeWidth={2.4}
              strokeOpacity={0.22}
              strokeLinecap="round"
            />
          )
        })}
      </g>
      {/* Crest highlight facets: a bright diagonal counter-line just before
          each crease, like light catching the raised edge of a fold. */}
      <g style={{ mixBlendMode: 'screen' }} opacity={0.55}>
        {extrema.filter((p) => p.type === 'crest').map((point, index) => {
          const th = height * thicknessAt(-maxAbs) * 1.1
          const dx = 3.5 * Math.cos((point.angleDeg * Math.PI) / 180)
          const dy = 3.5 * Math.sin((point.angleDeg * Math.PI) / 180)
          return (
            <line
              key={index}
              x1={point.x - dx - (th / 2) * Math.cos((point.angleDeg * Math.PI) / 180)}
              y1={point.y - dy - (th / 2) * Math.sin((point.angleDeg * Math.PI) / 180)}
              x2={point.x - dx + (th / 2) * Math.cos((point.angleDeg * Math.PI) / 180)}
              y2={point.y - dy + (th / 2) * Math.sin((point.angleDeg * Math.PI) / 180)}
              stroke="#ffffff"
              strokeWidth={1.6}
              strokeOpacity={0.5}
              strokeLinecap="round"
            />
          )
        })}
      </g>
      {/* Metal edge trim: thick dark base + bright satin core + fine outer
          rim — reads as a folded metal border, not a thin outline. */}
      <path d={edgeTop.join(' ')} fill="none" stroke="#0a1526" strokeWidth={4.2} strokeOpacity={0.75} />
      <path d={edgeBottom.join(' ')} fill="none" stroke="#0a1526" strokeWidth={4.2} strokeOpacity={0.75} />
      <path d={edgeTop.join(' ')} fill="none" stroke={edgeColor} strokeWidth={2.2} strokeOpacity={0.85} transform="translate(0 -1.4)" />
      <path d={edgeBottom.join(' ')} fill="none" stroke={edgeColor} strokeWidth={2.2} strokeOpacity={0.85} transform="translate(0 1.4)" />
      <path d={edgeTop.join(' ')} fill="none" stroke="#ffffff" strokeWidth={0.9} strokeOpacity={0.6} transform="translate(0 -2.3)" />
      <path d={edgeBottom.join(' ')} fill="none" stroke="#ffffff" strokeWidth={0.9} strokeOpacity={0.6} transform="translate(0 2.3)" />
    </g>
  )
}

type SideRibbonProps = {
  flagUrl: string
  side: 'left' | 'right'
  idSuffix: string
  edgeColor?: string
  /** Stripe structure of the flag: when set, renders satin color bands
      instead of the raw flag image (matches the bottom ribbon's look). */
  stripes?: FlagStripe[] | null
}

/**
 * Side ribbon: a folded band flowing from behind the badge edge downwards,
 * with a swallowtail cut. Drawn as three segments (back tail, fold, front);
 * when the flag's stripe structure is known, each stripe is rendered as a
 * satin-shaded band following the ribbon's own width (the drawn look),
 * otherwise the flag artwork is stretched along the front segment.
 */
export function SideRibbon({ flagUrl, side, idSuffix, edgeColor = '#e9eef5', stripes = null }: SideRibbonProps) {
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
  // The band runs roughly top-to-bottom along its own local axis (not the
  // global Y axis), so stripes are cut as near-horizontal slabs across the
  // clipped front shape — same trick as the bottom band's offset-curve fill,
  // simplified to horizontal bands since this path has no centerline curve.
  const bandTop = 292
  const bandBottom = 492
  const bandSpan = bandBottom - bandTop
  const stripeList = stripes ?? []
  const stripeBands = stripeList.map((stripe, index) => {
    const cumulativeBefore = stripeList.slice(0, index).reduce((sum, s) => sum + s.fraction, 0)
    const from = bandTop + bandSpan * cumulativeBefore
    const to = from + bandSpan * stripe.fraction
    return {
      color: stripe.color,
      y: from,
      height: to - from,
      gradientId: `srb-stripe-${idSuffix}-${index}`,
    }
  })

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        {/* Per-stripe satin gradient, consistent with the bottom band. */}
        {stripeBands.map((band) => (
          <linearGradient key={band.gradientId} id={band.gradientId} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor={shadeColor(band.color, 0.4)} />
            <stop offset="0.3" stopColor={shadeColor(band.color, 0.08)} />
            <stop offset="0.7" stopColor={band.color} />
            <stop offset="1" stopColor={shadeColor(band.color, -0.3)} />
          </linearGradient>
        ))}
        {/* Light from upper-left along the band. */}
        <linearGradient id={shadeId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="0.62" stopColor="rgba(8,16,32,0.08)" />
          <stop offset="0.82" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(8,16,32,0.36)" />
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
      <path d={frontPath} fill="#020a14" opacity="0.42" transform="translate(5 8)" style={{ filter: 'blur(6px)' }} />
      {/* Back fold tucked behind the frame. */}
      <path d={backPath} fill="#0a1526" opacity={0.9} />
      {/* Front band: satin stripe bands when the flag structure is known,
          otherwise the raw flag artwork flowing along the band. */}
      <g clipPath={`url(#${clipId})`}>
        {stripeBands.length > 0 ? (
          stripeBands.map((band) => (
            <rect key={band.gradientId} x={-10} y={band.y} width={150} height={band.height + 1} fill={`url(#${band.gradientId})`} />
          ))
        ) : (
          <image href={flagUrl} x={-52} y={270} width={240} height={240} preserveAspectRatio="xMidYMid slice" transform="rotate(28 70 386)" />
        )}
        <path d={frontPath} fill={`url(#${shadeId})`} />
        {/* Cloth texture. */}
        <path d={frontPath} fill="#ffffff" filter={`url(#${clothId})`} opacity="0.055" style={{ mixBlendMode: 'overlay' }} />
        {/* Swallowtail inner crease. */}
        <path d="M 62 476 L 96 456" stroke="rgba(8,16,32,0.5)" strokeWidth="2.5" fill="none" />
      </g>
      {/* Fold highlight where the band turns over. */}
      <path d={foldPath} fill={`url(#${foldId})`} />
      {/* Crisp fold-line facet where the ribbon bends behind the frame —
          matches the bottom band's crease treatment. */}
      <line x1="16" y1="296" x2="48" y2="308" stroke="#1a2438" strokeWidth={2} strokeOpacity={0.3} strokeLinecap="round" style={{ mixBlendMode: 'multiply' }} />
      {/* Metal edge trim: dark base + bright satin core, matching the bottom band. */}
      <path d={frontPath} fill="none" stroke="#0a1526" strokeWidth={3.4} strokeOpacity={0.7} />
      <path d={frontPath} fill="none" stroke={edgeColor} strokeWidth={1.6} strokeOpacity={0.8} />
    </g>
  )
}

