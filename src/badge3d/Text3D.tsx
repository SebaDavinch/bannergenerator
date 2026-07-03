import { getBadgeFont, type TextMaterial } from './fonts'

type Text3DProps = {
  text: string
  x: number
  y: number
  size: number
  fontFamily: string
  material: TextMaterial
  /** Extrusion depth in viewBox px (0 = flat sticker with outline only). */
  depth: number
  /** Arc bend: 0 = straight, positive = upward arch, in viewBox px of rise. */
  arch?: number
  accent?: string
  letterSpacing?: number
  idSuffix: string
}

const MATERIAL_FACE: Record<TextMaterial, { stops: Array<[number, string]>; outline: string; highlight: string }> = {
  chrome: {
    stops: [[0, '#ffffff'], [0.45, '#eef3fa'], [0.55, '#c6d2e2'], [1, '#f2f6fc']],
    outline: '#0b2545',
    highlight: '#ffffff',
  },
  gold: {
    stops: [[0, '#fff3c4'], [0.45, '#f4d570'], [0.6, '#d9a83c'], [1, '#f9e6a0']],
    outline: '#6d4a08',
    highlight: '#fffbe8',
  },
  enamel: {
    stops: [[0, '#ffffff'], [0.4, '#f2f5f9'], [1, '#dde5ee']],
    outline: '#12365c',
    highlight: '#ffffff',
  },
  neon: {
    stops: [[0, '#e8fbff'], [0.5, '#9beaff'], [1, '#4cc9f0']],
    outline: '#062b4a',
    highlight: '#e8fbff',
  },
  flat: {
    stops: [[0, '#f5f8ff'], [1, '#f5f8ff']],
    outline: '#0b2545',
    highlight: '#f5f8ff',
  },
}

/**
 * Extruded display text: stacked darkened copies underneath a gradient face
 * with a paint-order outline. Pure SVG so it survives html-to-image export.
 */
export function Text3D({
  text,
  x,
  y,
  size,
  fontFamily,
  material,
  depth,
  arch = 0,
  accent,
  letterSpacing = 0,
  idSuffix,
}: Text3DProps) {
  if (!text) {
    return null
  }
  const font = getBadgeFont(fontFamily)
  const face = MATERIAL_FACE[material]
  const effectiveSize = size * font.sizeFactor
  const gradientId = `t3d-face-${idSuffix}`
  const glowId = `t3d-glow-${idSuffix}`
  const archPathId = `t3d-arch-${idSuffix}`
  const outline = accent && material === 'flat' ? accent : face.outline
  const strokeWidth = Math.max(3, effectiveSize * 0.085)
  const depthSteps = Math.max(0, Math.round(depth))

  const common = {
    fontFamily,
    fontSize: effectiveSize,
    fontWeight: 700,
    letterSpacing,
    textAnchor: 'middle' as const,
  }

  // Arched variant renders along a shallow quadratic curve.
  const useArch = Math.abs(arch) > 1
  const archHalfWidth = Math.max(text.length * effectiveSize * 0.36, effectiveSize)

  const renderLayer = (dy: number, fill: string, stroke?: string, filter?: string) =>
    useArch ? (
      <text {...common} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : undefined} paintOrder="stroke" filter={filter} transform={`translate(0 ${dy})`}>
        <textPath href={`#${archPathId}`} startOffset="50%">{text}</textPath>
      </text>
    ) : (
      <text {...common} x={x} y={y + dy} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : undefined} paintOrder="stroke" filter={filter}>
        {text}
      </text>
    )

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {face.stops.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        {material === 'neon' ? (
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={effectiveSize * 0.08} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
        {useArch ? (
          <path
            id={archPathId}
            d={`M ${x - archHalfWidth} ${y} Q ${x} ${y - arch * 2} ${x + archHalfWidth} ${y}`}
            fill="none"
          />
        ) : null}
      </defs>
      {/* Extrusion body: stacked dark copies. */}
      {Array.from({ length: depthSteps }, (_, index) => {
        const step = depthSteps - index
        return (
          <g key={step} opacity={0.96}>
            {renderLayer(step, outline, outline)}
          </g>
        )
      })}
      {/* Face with outline. */}
      {renderLayer(0, `url(#${gradientId})`, outline, material === 'neon' ? `url(#${glowId})` : undefined)}
    </g>
  )
}
