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
  // Plane is authored nose-up (-Y); angle rotates the nose onto the trail's
  // end tangent so the aircraft always flies along its contrail.
  const trail: Record<ContrailVariant, { d: string; angle: number }> = {
    arc: { d: 'M -320 150 C -220 120 -120 60 -18 9', angle: 63 },
    climb: { d: 'M -260 210 C -180 190 -90 120 -14 12', angle: 35 },
    loop: { d: 'M -310 30 C -230 90 -170 110 -120 70 C -70 30 -60 -8 -14 6', angle: 107 },
  }
  const { d, angle } = trail[variant]

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
      <g transform={`rotate(${angle}) scale(1.05)`}>
        <AirlinerTopView color={color} />
      </g>
    </g>
  )
}

/**
 * Narrow-body airliner, clean top view, nose pointing UP (-Y).
 * Local frame: x -42..42, y -44..42.
 */
export function AirlinerTopView({ color = '#ffffff' }: { color?: string }) {
  return (
    <g fill={color}>
      {/* Fuselage: rounded nose, slender body, tapered tail cone. */}
      <path d="M 0 -44 C 2.6 -44 4 -40.5 4 -34 L 4 20 C 4 29 3 35 0 41 C -3 35 -4 29 -4 20 L -4 -34 C -4 -40.5 -2.6 -44 0 -44 Z" />
      {/* Main wings: swept back, tapering chord, rounded tips. */}
      <path d="M 3.8 -10 L 38 11 C 40.5 12.6 41.5 14.4 41 16.6 C 40.6 18.2 39.2 18.8 37.2 18.2 L 3.8 8 Z" />
      <path d="M -3.8 -10 L -38 11 C -40.5 12.6 -41.5 14.4 -41 16.6 C -40.6 18.2 -39.2 18.8 -37.2 18.2 L -3.8 8 Z" />
      {/* Engine nacelles on the wings, slightly ahead of the leading edge. */}
      <path d="M 12 -4.5 C 14.2 -4.5 15.4 -3.4 15.4 -1.2 L 15.4 6.4 C 15.4 7.6 14.6 8.2 13.7 8.2 L 10.3 8.2 C 9.4 8.2 8.6 7.6 8.6 6.4 L 8.6 -1.2 C 8.6 -3.4 9.8 -4.5 12 -4.5 Z" />
      <path d="M -12 -4.5 C -14.2 -4.5 -15.4 -3.4 -15.4 -1.2 L -15.4 6.4 C -15.4 7.6 -14.6 8.2 -13.7 8.2 L -10.3 8.2 C -9.4 8.2 -8.6 7.6 -8.6 6.4 L -8.6 -1.2 C -8.6 -3.4 -10.2 -4.5 -12 -4.5 Z" />
      {/* Horizontal stabilizers: smaller swept pair near the tail. */}
      <path d="M 3.2 28 L 16.5 36.5 C 18.2 37.6 18.8 38.9 18.4 40.4 C 18.1 41.5 17 41.9 15.6 41.5 L 3.2 37.5 Z" />
      <path d="M -3.2 28 L -16.5 36.5 C -18.2 37.6 -18.8 38.9 -18.4 40.4 C -18.1 41.5 -17 41.9 -15.6 41.5 L -3.2 37.5 Z" />
      {/* Tail fin seen from above: short spine highlight. */}
      <rect x="-1.1" y="30" width="2.2" height="10" rx="1.1" opacity="0.9" />
    </g>
  )
}

/**
 * Pilot wings emblem: five tapering feathers per side sweeping upward,
 * faceted star on a laurel base. Local frame ~ -64..64 x -16..12.
 */
export function WingsEmblem({ color = '#e9eef5', idSuffix }: { color?: string; idSuffix: string }) {
  const gid = `wng-${idSuffix}`
  const feathers = [0, 1, 2, 3, 4]
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor="#7d8a9c" />
        </linearGradient>
      </defs>
      {[1, -1].map((dir) => (
        <g key={dir} transform={dir === -1 ? 'scale(-1 1)' : undefined}>
          {feathers.map((i) => {
            // Each feather: starts near the star, sweeps out and up,
            // shorter and lower as i grows (top feather is longest).
            const baseX = 10
            const baseY = -1 + i * 3.4
            const tipX = 60 - i * 7
            const tipY = -13 + i * 4.6
            const midX = (baseX + tipX) * 0.55
            return (
              <path
                key={i}
                d={`M ${baseX} ${baseY}
                    C ${midX} ${baseY - 4.5} ${tipX - 9} ${tipY - 2.5} ${tipX} ${tipY}
                    C ${tipX - 4} ${tipY + 2.6} ${midX} ${baseY + 2.4} ${baseX} ${baseY + 2.6} Z`}
                fill={`url(#${gid})`}
                stroke="#0a1526"
                strokeWidth="0.7"
              />
            )
          })}
        </g>
      ))}
      {/* Star base disc. */}
      <circle r="8.6" fill={`url(#${gid})`} stroke="#0a1526" strokeWidth="0.9" />
      <circle r="6.8" fill="none" stroke="#0a1526" strokeWidth="0.5" strokeOpacity="0.5" />
      {/* Faceted star: light/dark halves per point. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = -90 + i * 72
        const rad = (deg: number) => (deg * Math.PI) / 180
        const tip = [Math.cos(rad(a)) * 7.4, Math.sin(rad(a)) * 7.4]
        const left = [Math.cos(rad(a - 30)) * 2.9, Math.sin(rad(a - 30)) * 2.9]
        const right = [Math.cos(rad(a + 30)) * 2.9, Math.sin(rad(a + 30)) * 2.9]
        return (
          <g key={i}>
            <path d={`M ${tip[0]} ${tip[1]} L ${left[0]} ${left[1]} L 0 0 Z`} fill="#ffffff" />
            <path d={`M ${tip[0]} ${tip[1]} L ${right[0]} ${right[1]} L 0 0 Z`} fill="#93a1b3" />
          </g>
        )
      })}
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
