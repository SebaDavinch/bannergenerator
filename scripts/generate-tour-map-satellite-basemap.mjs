import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { geoNaturalEarth1 } from 'd3-geo'
import { feature } from 'topojson-client'

const projectRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = process.argv[2]
const outputPath = path.resolve(projectRoot, process.argv[3] ?? 'src/assets/tour-map-satellite-relief.webp')
const resolutionScale = Number(process.argv[4] ?? '2')

if (!sourcePath) {
  console.error('Usage: node scripts/generate-tour-map-satellite-basemap.mjs <source-raster> [output] [resolutionScale]')
  process.exit(1)
}

if (!Number.isFinite(resolutionScale) || resolutionScale <= 0) {
  console.error(`Invalid resolution scale: ${process.argv[4]}`)
  process.exit(1)
}

const worldLandAtlas = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'node_modules/world-atlas/land-110m.json'), 'utf8'))
const landFeature = feature(worldLandAtlas, worldLandAtlas.objects.land)

const tourMapViewBox = {
  width: 1180,
  height: 620,
}

const outputWidth = Math.round(tourMapViewBox.width * resolutionScale)
const outputHeight = Math.round(tourMapViewBox.height * resolutionScale)
const paddingX = 42 * resolutionScale
const paddingY = 34 * resolutionScale

const projection = geoNaturalEarth1().fitExtent(
  [
    [paddingX, paddingY],
    [outputWidth - paddingX, outputHeight - paddingY],
  ],
  landFeature,
)

const source = sharp(path.resolve(sourcePath)).removeAlpha().rotate()
const { data: sourcePixels, info } = await source.raw().toBuffer({ resolveWithObject: true })

const outputPixels = Buffer.alloc(outputWidth * outputHeight * 4)
const sampleChannels = Math.min(info.channels, 3)

function getSourceChannel(x, y, channel) {
  const clampedX = Math.max(0, Math.min(info.width - 1, x))
  const clampedY = Math.max(0, Math.min(info.height - 1, y))
  return sourcePixels[(clampedY * info.width + clampedX) * info.channels + channel]
}

function sampleBilinear(x, y, channel) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(info.width - 1, x0 + 1)
  const y1 = Math.min(info.height - 1, y0 + 1)
  const tx = x - x0
  const ty = y - y0

  const top = getSourceChannel(x0, y0, channel) * (1 - tx) + getSourceChannel(x1, y0, channel) * tx
  const bottom = getSourceChannel(x0, y1, channel) * (1 - tx) + getSourceChannel(x1, y1, channel) * tx
  return Math.round(top * (1 - ty) + bottom * ty)
}

for (let y = 0; y < outputHeight; y += 1) {
  for (let x = 0; x < outputWidth; x += 1) {
    const lonLat = projection.invert([x + 0.5, y + 0.5])
    const outputIndex = (y * outputWidth + x) * 4

    if (!lonLat) {
      outputPixels[outputIndex + 3] = 0
      continue
    }

    const [longitude, latitude] = lonLat
    const sourceX = ((longitude + 180) / 360) * (info.width - 1)
    const sourceY = ((90 - latitude) / 180) * (info.height - 1)

    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) {
      outputPixels[outputIndex + 3] = 0
      continue
    }

    outputPixels[outputIndex] = sampleBilinear(sourceX, sourceY, 0)
    outputPixels[outputIndex + 1] = sampleBilinear(sourceX, sourceY, Math.min(1, sampleChannels - 1))
    outputPixels[outputIndex + 2] = sampleBilinear(sourceX, sourceY, Math.min(2, sampleChannels - 1))
    outputPixels[outputIndex + 3] = 255
  }
}

await sharp(outputPixels, {
  raw: {
    width: outputWidth,
    height: outputHeight,
    channels: 4,
  },
})
  .modulate({ brightness: 0.9, saturation: 0.92 })
  .blur(0.7)
  .webp({ quality: 86, alphaQuality: 92 })
  .toFile(outputPath)

console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${sourcePath}`)