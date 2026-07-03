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

const SLICES = 36

/**
 * Waving flag band: the flag image is sliced into vertical strips, each strip
 * shifted along a sine wave; a shading overlay driven by the same wave makes
 * crests light and troughs dark, so the flag artwork itself appears to ripple.
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
  const sliceWidth = VB / SLICES
  const offsets: number[] = []
  for (let index = 0; index <= SLICES; index += 1) {
    const t = index / SLICES
    offsets.push(Math.sin((t * waves + phase) * Math.PI * 2) * amplitude)
  }
  const shadeId = `frw-shade-${idSuffix}`
  const sliceClipId = `frw-slice-${idSuffix}`
  const edgeTop: string[] = []
  const edgeBottom: string[] = []
  offsets.forEach((offset, index) => {
    const x = index * sliceWidth
    edgeTop.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy - height / 2 + offset}`)
    edgeBottom.push(`${index === 0 ? 'M' : 'L'} ${x} ${cy + height / 2 + offset}`)
  })

  return (
    <g transform={mirror ? `translate(${VB} 0) scale(-1 1)` : undefined}>
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0">
          {offsets.map((offset, index) => {
            const t = index / SLICES
            // Slope of the wave decides light: rising = lit, falling = shaded.
            const next = offsets[Math.min(index + 1, SLICES)]
            const slope = (next - offset) / sliceWidth
            const light = Math.max(-0.55, Math.min(0.45, -slope * 2.2))
            const color = light >= 0
              ? `rgba(255,255,255,${(light * 0.55).toFixed(3)})`
              : `rgba(8,16,32,${(-light * 0.6).toFixed(3)})`
            return <stop key={index} offset={t} stopColor={color} />
          })}
        </linearGradient>
        {/* Every strip is clipped to its own column (local frame is shared). */}
        <clipPath id={sliceClipId}>
          <rect
            x={-sliceWidth / 2 - 1.6}
            y={-height / 2 - 1}
            width={sliceWidth + 3.2}
            height={height + 2}
          />
        </clipPath>
      </defs>
      {/* Flag strips: full flag image per strip, sheared along the wave and
          clipped to the strip column so stripes stay continuous. */}
      {Array.from({ length: SLICES }, (_, index) => {
        const x = index * sliceWidth
        const offset = (offsets[index] + offsets[index + 1]) / 2
        const skew = Math.atan2(offsets[index + 1] - offsets[index], sliceWidth) * (180 / Math.PI)
        return (
          <g
            key={index}
            transform={`translate(${x + sliceWidth / 2} ${cy + offset}) skewY(${skew.toFixed(2)})`}
            clipPath={`url(#${sliceClipId})`}
          >
            <image
              href={flagUrl}
              x={-((index + 0.5) * sliceWidth)}
              y={-height / 2}
              width={VB}
              height={height}
              preserveAspectRatio="none"
            />
          </g>
        )
      })}
      {/* Wave shading synced to the same offsets. */}
      <path
        d={`${edgeTop.join(' ')} L ${VB} ${cy + height / 2 + offsets[SLICES]} ${edgeBottom.slice().reverse().map((cmd) => cmd.replace(/^[ML]/, 'L')).join(' ')} Z`}
        fill={`url(#${shadeId})`}
      />
      {/* Edge accents: a dark seam plus a thin metal highlight so the band
          separates from the background without reading as a white border. */}
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

