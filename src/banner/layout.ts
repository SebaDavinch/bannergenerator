/** Title size that keeps long names on ≤ maxLines inside the column. */
export function titleSize(text: string, opts: { max?: number; min?: number; width?: number; lines?: number } = {}) {
  const { max = 128, min = 64, width = 1100, lines = 2 } = opts
  const len = Math.max(1, text.trim().length)
  // Oswald 700 uppercase averages ~0.5em per glyph.
  const fit = (width * lines) / (len * 0.52)
  return Math.round(Math.max(min, Math.min(max, fit)))
}

/** Reward line size that keeps it on one line left of the logo (~1150px). */
export function rewardSize(text: string, width = 1150, max = 60) {
  return Math.round(Math.max(40, Math.min(max, width / (text.length * 0.55))))
}
