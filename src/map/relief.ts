import { useEffect, useState } from 'react'
import { loadWorld } from '../data/geo'
import { loadPhysical } from '../data/physical'
import type { ProjectionSpec } from './projection'
import { STAGE_H, STAGE_W } from './projection'
import type { ReliefPalette } from './themes'
import type { ReliefRequest, ReliefResponse } from './relief.worker'

let worker: Worker | null = null
let seq = 0
let waterSent = false
const waiting = new Map<number, (r: ReliefResponse) => void>()
const pending = new Set<Promise<unknown>>()
const cache = new Map<string, string>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./relief.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<ReliefResponse>) => {
      waiting.get(e.data.id)?.(e.data)
      waiting.delete(e.data.id)
    }
  }
  return worker
}

async function request(spec: ProjectionSpec, palette: ReliefPalette, strength: number, resolution: number): Promise<string> {
  const key = JSON.stringify([spec, palette, strength, resolution])
  const hit = cache.get(key)
  if (hit) return hit
  const req: ReliefRequest = {
    id: ++seq, spec, palette, strength, resolution, width: STAGE_W, height: STAGE_H, base: new URL(import.meta.env.BASE_URL, location.href).href,
  }
  if (!waterSent) {
    const [world, phys] = await Promise.all([loadWorld(), loadPhysical().catch(() => null)])
    req.water = { land: world.land, lakes: phys?.lakes ?? { type: 'FeatureCollection', features: [] } }
    waterSent = true
  }
  const res = await new Promise<ReliefResponse>((resolve) => {
    waiting.set(req.id, resolve)
    getWorker().postMessage(req)
  })
  if (!res.blob) throw new Error(res.error || 'relief failed')
  const url = URL.createObjectURL(res.blob)
  cache.set(key, url)
  if (cache.size > 24) {
    const first = cache.keys().next().value as string
    URL.revokeObjectURL(cache.get(first)!)
    cache.delete(first)
  }
  return url
}

/** Resolves once every relief render in flight has landed (the export waits on this). */
export async function reliefIdle() {
  while (pending.size) await Promise.allSettled([...pending])
}

/**
 * Relief image for a projection: a half-resolution draft first, then the
 * full 1920×1080 render. Returns the latest finished URL (the previous one
 * stays visible while the next renders).
 */
export function useRelief(spec: ProjectionSpec | null, palette: ReliefPalette, strength: number, enabled: boolean, settled: boolean) {
  const [url, setUrl] = useState('')
  const key = enabled && spec && settled ? JSON.stringify([spec, palette, strength]) : ''

  useEffect(() => {
    if (!key || !spec) return
    let alive = true
    const timer = window.setTimeout(() => {
      const job = (async () => {
        try {
          const draft = await request(spec, palette, strength, 0.4)
          if (alive) setUrl(draft)
          const full = await request(spec, palette, strength, 1)
          if (alive) setUrl(full)
        } catch { /* keep the previous image */ }
      })()
      pending.add(job)
      job.finally(() => pending.delete(job))
    }, 90)
    return () => { alive = false; window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return enabled ? url : ''
}
