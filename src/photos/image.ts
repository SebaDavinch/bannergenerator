import { useEffect, useState } from 'react'
import { apiBase } from '../data/fleet'
import type { PhotoState } from '../types'

/** Longest edge we keep for banner backgrounds: enough for a crisp 4K export of a cropped area. */
export const MAX_EDGE = 3200

const cache = new Map<string, Promise<string>>()

async function optimize(blob: Blob, maxEdge = MAX_EDGE, quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  // Small enough JPEGs pass through untouched to avoid a lossy re-encode.
  if (scale === 1 && blob.type === 'image/jpeg' && blob.size < 2_500_000) {
    bitmap.close()
    return blob
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const hasAlpha = blob.type === 'image/png' || blob.type === 'image/webp'
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), hasAlpha ? 'image/webp' : 'image/jpeg', quality),
  )
}

async function fetchImage(url: string): Promise<Blob> {
  const attempts = [
    () => fetch(url, { mode: 'cors', credentials: 'omit' }),
    () => fetch(`${apiBase()}/aircraft/photo-proxy?url=${encodeURIComponent(url)}`),
  ]
  let lastError: unknown
  for (const attempt of attempts) {
    try {
      const res = await attempt()
      if (res.ok && (res.headers.get('content-type') || '').startsWith('image/')) return await res.blob()
      lastError = new Error(`HTTP ${res.status}`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/**
 * Fetches a remote image into a local, size-capped blob URL. Local URLs keep the
 * PNG export working (no tainted canvas) and keep the preview light.
 */
export function resolveImage(url: string): Promise<string> {
  if (!url || !/^https?:/i.test(url)) return Promise.resolve(url)
  let p = cache.get(url)
  if (!p) {
    p = fetchImage(url)
      .then((blob) => optimize(blob))
      .then((blob) => URL.createObjectURL(blob))
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

export async function fileToDataUrl(file: Blob, maxEdge = MAX_EDGE): Promise<string> {
  const blob = await optimize(file, maxEdge, 0.88)
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export type ImageStatus = 'empty' | 'loading' | 'ready' | 'remote' | 'error'

/** Display URL for a PhotoState: uploads win, remote sources are localized. */
export function usePhotoUrl(photo: PhotoState | undefined) {
  const source = photo?.local || photo?.src || ''
  const [state, setState] = useState<{ source: string; url: string; status: ImageStatus }>({ source: '', url: '', status: 'empty' })

  useEffect(() => {
    let alive = true
    if (!source) return
    resolveImage(source)
      .then((url) => alive && setState({ source, url, status: 'ready' }))
      // CORS refused and no backend proxy: show the remote file anyway (export may skip it).
      .catch(() => alive && setState({ source, url: source, status: 'remote' }))
    return () => { alive = false }
  }, [source])

  if (!source) return { url: '', status: 'empty' as ImageStatus }
  if (state.source !== source) return { url: '', status: 'loading' as ImageStatus }
  return { url: state.url, status: state.status }
}
