import { useEffect, useState } from 'react'
import { feature, mesh } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Polygon } from 'geojson'

export interface WorldGeo {
  land: FeatureCollection<Polygon | MultiPolygon>
  borders: MultiLineString
}

let promise: Promise<WorldGeo> | null = null
let ready: WorldGeo | null = null

export function loadWorld() {
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/countries-50m.json`)
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection; land: GeometryCollection }>) => {
        const land = feature(topo, topo.objects.land) as unknown as FeatureCollection<Polygon | MultiPolygon> | Feature<MultiPolygon>
        ready = {
          land: 'features' in land ? land : { type: 'FeatureCollection', features: [land] },
          borders: mesh(topo, topo.objects.countries, (a, b) => a !== b) as MultiLineString,
        }
        return ready
      })
  }
  return promise
}

export function useWorld() {
  const [world, setWorld] = useState<WorldGeo | null>(ready)
  useEffect(() => {
    if (!world) loadWorld().then(setWorld).catch(() => undefined)
  }, [world])
  return world
}
