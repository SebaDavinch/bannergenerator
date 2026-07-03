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

/**
 * Builds a horizontal displacement map (sine encoded in the green channel,
 * red pinned to 128 so dx stays 0) as an inline SVG data URI for feImage.
 */
function buildWaveMap(waves: number, phase: number): string {
  const stops: string[] = []
  for (let index = 0; index <= WAVE_SAMPLES; index += 1) {
    const t = index / WAVE_SAMPLES
    // Inverted sine: feDisplacementMap samples the source at +dy, so visual
    // offset is the negation — this keeps edges/shading formulas in +sin.
    const g = Math.round((0.5 - 0.5 * Math.sin((t * waves + phase) * Math.PI * 2)) * 255)
    stops.push(`<stop offset="${t.toFixed(4)}" stop-color="rgb(128,${g},0)"/>`)
  }
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
  const offsets: number[] = []
  for (let index = 0; index <= WAVE_SAMPLES; index += 1) {
    const t = index / WAVE_SAMPLES
    offsets.push(Math.sin((t * waves + phase) * Math.PI * 2) * amplitude)
  }
  const shadeId = `frw-shade-${idSuffix}`
  const filterId = `frw-disp-${idSuffix}`
  const stepX = VB / WAVE_SAMPLES
  const edgeTop: string[] = []
  const edgeBottom: string[] = []
  offsets.forEach((offset, index) => {
    const x = index * stepX
    edgeTop.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy - height / 2 + offset}`)
    edgeBottom.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy + height / 2 + offset}`)
  })
  const pad = amplitude + 4

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
            const light = Math.max(-0.55, Math.min(0.45, -slope * 2.2))
            const color = light >= 0
              ? `rgba(255,255,255,${(light * 0.55).toFixed(3)})`
              : `rgba(8,16,32,${(-light * 0.6).toFixed(3)})`
            return <stop key={index} offset={t} stopColor={color} />
          })}
        </linearGradient>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x={-8}
          y={cy - height / 2 - pad}
          width={VB + 16}
          height={height + pad * 2}
        >
          <feImage
            href={buildWaveMap(waves, phase)}
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
            scale={amplitude * 2}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
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
      <path
        d={`${edgeTop.join(' ')} L ${VB} ${cy + height / 2 + offsets[WAVE_SAMPLES]} ${edgeBottom.slice().reverse().map((cmd) => cmd.replace(/^[ML]/, 'L')).join(' ')} Z`}
        fill={`url(#${shadeId})`}
      />
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
  const clipId = `srb-clip-${idSuffix}`
  // Geometry authored for the left side, mirrored for the right.
  const frontPath = 'M 18 300 C 44 332 64 352 74 400 L 66 470 L 104 452 L 128 486 C 118 420 104 372 66 318 Z'
  const backPath = 'M 18 300 L 66 318 L 50 282 Z'

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="0.45" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(8,16,32,0.45)" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={frontPath} />
        </clipPath>
      </defs>
      {/* Back fold (darker, tucked behind). */}
      <path d={backPath} fill="#0a1526" opacity={0.85} />
      {/* Front band with flag artwork. */}
      <g clipPath={`url(#${clipId})`}>
        <image href={flagUrl} x={-40} y={280} width={220} height={220} preserveAspectRatio="xMidYMid slice" transform="rotate(24 74 380)" />
        <path d={frontPath} fill={`url(#${shadeId})`} />
      </g>
      <path d={frontPath} fill="none" stroke={edgeColor} strokeWidth={3} strokeOpacity={0.85} />
    </g>
  )
}

