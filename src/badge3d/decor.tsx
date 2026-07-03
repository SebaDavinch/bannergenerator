export type ContrailVariant = 'arc' | 'climb' | 'loop'

type PlaneContrailProps = {
  variant: ContrailVariant
  color?: string
  idSuffix: string
}

/**
 * Detailed airliner silhouette (top view) with a fading contrail.
 * Authored in a 100x100 local frame, positioned by the parent transform.
 */
export function PlaneWithContrail({ variant, color = '#ffffff', idSuffix }: PlaneContrailProps) {
  const trailId = `pct-${idSuffix}`
  const trail: Record<ContrailVariant, { d: string; planeAt: { x: number; y: number; angle: number } }> = {
    arc: {
      d: 'M -320 150 C -220 120 -120 60 -18 6',
      planeAt: { x: 0, y: 0, angle: 28 },
    },
    climb: {
      d: 'M -260 210 C -180 190 -90 120 -16 14',
      planeAt: { x: 0, y: 0, angle: 42 },
    },
    loop: {
      d: 'M -310 30 C -230 90 -170 110 -120 70 C -70 30 -60 -10 -16 4',
      planeAt: { x: 0, y: 0, angle: 8 },
    },
  }
  const { d, planeAt } = trail[variant]

  return (
    <g>
      <defs>
        <linearGradient id={trailId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.75" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${trailId})`} strokeWidth={7} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${trailId})`} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} transform="translate(0 6)" />
      <g transform={`translate(${planeAt.x} ${planeAt.y}) rotate(${planeAt.angle}) scale(1.15)`}>
        <AirlinerTopView color={color} />
      </g>
    </g>
  )
}

/** Narrow-body airliner, top view, nose pointing +X. Local frame ~ -34..34. */
export function AirlinerTopView({ color = '#ffffff' }: { color?: string }) {
  return (
    <g fill={color}>
      {/* Fuselage with nose taper and tail cone. */}
      <path d="M 30 0 C 30 -2.6 27 -3.4 22 -3.6 L -16 -3 C -22 -2.8 -27 -2 -30.5 -0.8 C -31.5 -0.4 -31.5 0.4 -30.5 0.8 C -27 2 -22 2.8 -16 3 L 22 3.6 C 27 3.4 30 2.6 30 0 Z" />
      {/* Wings, swept. */}
      <path d="M 6 -2.4 L -3 -30 C -3.6 -31.8 -5.6 -32.4 -7 -31 L -9.4 -28.6 C -10.2 -27.8 -10.5 -26.6 -10.2 -25.4 L -5.6 -2.2 Z" />
      <path d="M 6 2.4 L -3 30 C -3.6 31.8 -5.6 32.4 -7 31 L -9.4 28.6 C -10.2 27.8 -10.5 26.6 -10.2 25.4 L -5.6 2.2 Z" />
      {/* Engines under wings. */}
      <rect x="-1.5" y="-13.5" width="7.5" height="3.4" rx="1.7" />
      <rect x="-1.5" y="10.1" width="7.5" height="3.4" rx="1.7" />
      {/* Horizontal stabilizers. */}
      <path d="M -24 -1.6 L -30.5 -11 C -31.3 -12.2 -32.8 -12.2 -33.4 -11 L -34 -9.6 C -34.3 -8.8 -34 -7.9 -33.3 -7.3 L -26.8 -1 Z" />
      <path d="M -24 1.6 L -30.5 11 C -31.3 12.2 -32.8 12.2 -33.4 11 L -34 9.6 C -34.3 8.8 -34 7.9 -33.3 7.3 L -26.8 1 Z" />
      {/* Cockpit windows hint. */}
      <path d="M 27.6 -1.4 C 28.8 -1 28.8 1 27.6 1.4 L 25.4 2 L 25.4 -2 Z" fill="#0b2545" opacity="0.55" />
    </g>
  )
}

/** Pilot wings emblem with a star, chrome-look. Local frame ~ -60..60 x -14..14. */
export function WingsEmblem({ color = '#e9eef5', idSuffix }: { color?: string; idSuffix: string }) {
  const gid = `wng-${idSuffix}`
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor="#8d9aab" />
        </linearGradient>
      </defs>
      {/* Left wing: three feather bars. */}
      {[0, 1, 2].map((i) => (
        <g key={`l${i}`}>
          <path
            d={`M -12 ${-2 + i * 5} C ${-26 - i * 5} ${-6 + i * 5} ${-42 - i * 6} ${-4 + i * 5} ${-54 - i * 2} ${2 + i * 5} C ${-40 - i * 5} ${2 + i * 5} ${-24 - i * 3} ${4 + i * 4} -12 ${2 + i * 4} Z`}
            fill={`url(#${gid})`}
            stroke="#0a1526"
            strokeWidth="0.8"
          />
          <path
            d={`M 12 ${-2 + i * 5} C ${26 + i * 5} ${-6 + i * 5} ${42 + i * 6} ${-4 + i * 5} ${54 + i * 2} ${2 + i * 5} C ${40 + i * 5} ${2 + i * 5} ${24 + i * 3} ${4 + i * 4} 12 ${2 + i * 4} Z`}
            fill={`url(#${gid})`}
            stroke="#0a1526"
            strokeWidth="0.8"
          />
        </g>
      ))}
      {/* Center star. */}
      <path
        d="M 0 -9 L 2.6 -2.9 L 9.2 -2.4 L 4.2 1.9 L 5.7 8.4 L 0 4.9 L -5.7 8.4 L -4.2 1.9 L -9.2 -2.4 L -2.6 -2.9 Z"
        fill={`url(#${gid})`}
        stroke="#0a1526"
        strokeWidth="0.9"
      />
    </g>
  )
}

/** Small wing bars used as text separators: =≡ TEXT ≡= */
export function WingSeparator({ color = '#e9eef5', side }: { color?: string; side: 'left' | 'right' }) {
  return (
    <g fill={color} transform={side === 'right' ? 'scale(-1 1)' : undefined}>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M 0 ${i * 5 - 5} L ${-26 + i * 6} ${i * 5 - 8} L ${-26 + i * 6} ${i * 5 - 6.2} L 0 ${i * 5 - 3.4} Z`}
          opacity={0.95 - i * 0.15}
        />
      ))}
    </g>
  )
}
