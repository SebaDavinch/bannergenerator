export type FlagStripe = {
  color: string
  /** Fraction of the band height, 0..1; fractions sum to 1. */
  fraction: number
}

const cache = new Map<string, FlagStripe[] | null>()

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

/**
 * Extracts the horizontal stripe structure of a flag by sampling a pixel
 * column and clustering consecutive similar colors. Works for the majority
 * of flags (stripes/bicolors); returns null for complex emblems so the
 * caller can fall back to the image-based band.
 */
export async function extractFlagStripes(flagUrl: string): Promise<FlagStripe[] | null> {
  const cached = cache.get(flagUrl)
  if (cached !== undefined) {
    return cached
  }
  try {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('flag load failed'))
      image.src = flagUrl
    })
    const canvas = document.createElement('canvas')
    const W = 60
    const H = 80
    canvas.width = W
    canvas.height = H
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      cache.set(flagUrl, null)
      return null
    }
    context.drawImage(image, 0, 0, W, H)
    // Sample three columns (25%, 50%, 75%) — a stripe flag gives identical
    // cluster structure in all of them; disagreement means emblem/complex.
    const columns = [Math.floor(W * 0.25), Math.floor(W * 0.5), Math.floor(W * 0.75)].map((x) => {
      const data = context.getImageData(x, 0, 1, H).data
      const pixels: Array<[number, number, number]> = []
      for (let y = 0; y < H; y += 1) {
        pixels.push([data[y * 4], data[y * 4 + 1], data[y * 4 + 2]])
      }
      return pixels
    })
    const clusterColumn = (pixels: Array<[number, number, number]>): FlagStripe[] => {
      const stripes: Array<{ sum: [number, number, number]; count: number }> = []
      pixels.forEach((pixel) => {
        const last = stripes[stripes.length - 1]
        if (last && colorDistance(pixel, [last.sum[0] / last.count, last.sum[1] / last.count, last.sum[2] / last.count]) < 90) {
          last.sum[0] += pixel[0]
          last.sum[1] += pixel[1]
          last.sum[2] += pixel[2]
          last.count += 1
        } else {
          stripes.push({ sum: [...pixel] as [number, number, number], count: 1 })
        }
      })
      return stripes
        .filter((stripe) => stripe.count >= 4)
        .map((stripe) => ({
          color: `rgb(${Math.round(stripe.sum[0] / stripe.count)},${Math.round(stripe.sum[1] / stripe.count)},${Math.round(stripe.sum[2] / stripe.count)})`,
          fraction: stripe.count / H,
        }))
    }
    const clustered = columns.map(clusterColumn)
    const counts = clustered.map((c) => c.length)
    // All three columns must agree on stripe count, and it must be 1..5.
    if (counts[0] !== counts[1] || counts[1] !== counts[2] || counts[0] < 1 || counts[0] > 5) {
      cache.set(flagUrl, null)
      return null
    }
    // Average the columns and normalize fractions.
    const result: FlagStripe[] = clustered[1].map((stripe) => ({ ...stripe }))
    const total = result.reduce((sum, stripe) => sum + stripe.fraction, 0)
    result.forEach((stripe) => {
      stripe.fraction /= total
    })
    cache.set(flagUrl, result)
    return result
  } catch {
    cache.set(flagUrl, null)
    return null
  }
}
