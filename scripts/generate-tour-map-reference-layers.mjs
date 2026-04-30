import fs from 'node:fs/promises'
import path from 'node:path'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const projectRoot = path.resolve(import.meta.dirname, '..')

const tourMapViewBox = {
  width: 1180,
  height: 620,
}

const steppeFeatureNames = new Set([
  'PONTIC STEPPE',
  'KAZAKH STEPPE',
  'TURAN LOWLAND',
  'CASPIAN DEPRESSION',
  'WESTERN SIBERIAN PLAIN',
  'NORTH SIBERIAN LOWLAND',
  'NORTHERN EUROPEAN PLAIN',
  'BALTIC PLAINS',
])

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function boundsToObject(bounds) {
  return {
    minX: Number(bounds[0][0].toFixed(3)),
    minY: Number(bounds[0][1].toFixed(3)),
    maxX: Number(bounds[1][0].toFixed(3)),
    maxY: Number(bounds[1][1].toFixed(3)),
  }
}

function createProjectedAreaFeature(pathGenerator, sourceFeature, index) {
  const svgPath = pathGenerator(sourceFeature)

  if (!svgPath) {
    return null
  }

  const bounds = pathGenerator.bounds(sourceFeature)
  const name = sourceFeature.properties?.name_en ?? sourceFeature.properties?.name ?? sourceFeature.properties?.NAME ?? `feature-${index}`

  return {
    key: `${slugify(name)}-${sourceFeature.properties?.ne_id ?? sourceFeature.properties?.NE_ID ?? index}-${index}`,
    path: svgPath,
    area: Number(pathGenerator.area(sourceFeature).toFixed(3)),
    bounds: boundsToObject(bounds),
    name,
    scaleRank: Number(sourceFeature.properties?.scalerank ?? 10),
  }
}

function createProjectedLineFeature(pathGenerator, sourceFeature, index) {
  const svgPath = pathGenerator(sourceFeature)

  if (!svgPath) {
    return null
  }

  const bounds = pathGenerator.bounds(sourceFeature)
  const name = sourceFeature.properties?.name_en ?? sourceFeature.properties?.name ?? `river-${index}`

  return {
    key: `${slugify(name)}-${sourceFeature.properties?.rivernum ?? index}-${index}`,
    path: svgPath,
    bounds: boundsToObject(bounds),
    scaleRank: Number(sourceFeature.properties?.scalerank ?? 10),
    name,
  }
}

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.json()
}

const worldLandAtlas = JSON.parse(await fs.readFile(path.resolve(projectRoot, 'node_modules/world-atlas/land-110m.json'), 'utf8'))
const landFeature = feature(worldLandAtlas, worldLandAtlas.objects.land)
const projection = geoNaturalEarth1().fitExtent(
  [
    [42, 34],
    [tourMapViewBox.width - 42, tourMapViewBox.height - 34],
  ],
  landFeature,
)
const pathGenerator = geoPath(projection)

const [lakesGeoJson, riversGeoJson, geographyRegionsGeoJson] = await Promise.all([
  fetchJson('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson'),
  fetchJson('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson'),
  fetchJson('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson'),
])

const lakes = lakesGeoJson.features
  .map((item, index) => createProjectedAreaFeature(pathGenerator, item, index))
  .filter((item) => item && (item.scaleRank <= 5 || item.area >= 34))

const rivers = riversGeoJson.features
  .filter((item) => item?.properties?.featurecla === 'River' && Number(item?.properties?.scalerank ?? 10) <= 5)
  .map((item, index) => createProjectedLineFeature(pathGenerator, item, index))
  .filter(Boolean)

const steppeRegions = geographyRegionsGeoJson.features
  .filter((item) => steppeFeatureNames.has(item?.properties?.NAME))
  .map((item, index) => createProjectedAreaFeature(pathGenerator, item, index))
  .filter(Boolean)

await Promise.all([
  fs.writeFile(path.resolve(projectRoot, 'src/assets/tour-map-lakes.json'), `${JSON.stringify(lakes, null, 2)}\n`),
  fs.writeFile(path.resolve(projectRoot, 'src/assets/tour-map-rivers.json'), `${JSON.stringify(rivers, null, 2)}\n`),
  fs.writeFile(path.resolve(projectRoot, 'src/assets/tour-map-steppe.json'), `${JSON.stringify(steppeRegions, null, 2)}\n`),
])

console.log(`Generated ${lakes.length} lakes, ${rivers.length} rivers, and ${steppeRegions.length} steppe regions.`)