import { useEffect, useState } from 'react'
import type { FeatureCollection, Geometry } from 'geojson'

/** [name, nameRu, iso2, lon, lat, population, isCapital] */
export type Place = [string, string, string, number, number, number, number]

export interface Physical {
  rivers: FeatureCollection<Geometry>
  lakes: FeatureCollection<Geometry>
  places: Place[]
}

let promise: Promise<Physical> | null = null
let ready: Physical | null = null

export function loadPhysical() {
  if (!promise) {
    const base = import.meta.env.BASE_URL
    promise = Promise.all([
      fetch(`${base}data/physical.json`).then((r) => r.json()),
      fetch(`${base}data/places.json`).then((r) => r.json()),
    ]).then(([phys, places]) => {
      ready = {
        rivers: { type: 'FeatureCollection', features: phys.rivers },
        lakes: { type: 'FeatureCollection', features: phys.lakes },
        places,
      }
      return ready
    })
  }
  return promise
}

export function usePhysical() {
  const [p, setP] = useState<Physical | null>(ready)
  useEffect(() => {
    if (!p) loadPhysical().then(setP).catch(() => undefined)
  }, [p])
  return p
}
