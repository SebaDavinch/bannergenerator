import { useEffect, useState } from 'react'
import { idb } from '../lib/idb'
import type { Locale, ModeId } from '../types'

export interface HistoryItem {
  id: string
  at: string
  mode: ModeId
  /** Project id (vAMSYS). Older records called it brand. */
  brand: string
  bannerLang: Locale
  title: string
  thumb: string
  width: number
  height: number
  format: string
  fileName: string
  size: number
  favorite?: boolean
  note?: string
  /** Snapshot of the mode's editor data at export time. */
  data: unknown
  /** True when the full-size export is stored and can be downloaded again. */
  hasBlob?: boolean
}

const LEGACY_KEY = 'banner-studio:history'
const listeners = new Set<() => void>()
let cache: HistoryItem[] | null = null
let migrated = false

const notify = () => listeners.forEach((l) => l())
const sort = (list: HistoryItem[]) => list.sort((a, b) => b.at.localeCompare(a.at))

async function load(): Promise<HistoryItem[]> {
  if (!migrated) {
    migrated = true
    // One-time move of the old localStorage history into IndexedDB.
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]') as Partial<HistoryItem>[]
      for (const h of old) {
        await idb.put('history', { bannerLang: 'en', width: 0, height: 0, format: 'png', fileName: h.title ?? 'banner', size: 0, ...h })
      }
      localStorage.removeItem(LEGACY_KEY)
    } catch { /* nothing to migrate */ }
  }
  cache = sort(await idb.all<HistoryItem>('history'))
  return cache
}

export async function pushHistory(item: Omit<HistoryItem, 'id' | 'at' | 'hasBlob'>, blob?: Blob) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const record: HistoryItem = { ...item, id, at: new Date().toISOString(), hasBlob: !!blob }
  await idb.put('history', record)
  if (blob) await idb.put('blobs', blob, id).catch(() => idb.put('history', { ...record, hasBlob: false }))
  await load()
  notify()
  return record
}

export async function updateHistory(id: string, patch: Partial<HistoryItem>) {
  const cur = await idb.get<HistoryItem>('history', id)
  if (!cur) return
  await idb.put('history', { ...cur, ...patch })
  await load()
  notify()
}

export async function removeHistory(id: string) {
  await idb.del('history', id)
  await idb.del('blobs', id).catch(() => undefined)
  await load()
  notify()
}

export async function clearHistory() {
  await idb.clear('history')
  await idb.clear('blobs')
  await load()
  notify()
}

export const historyBlob = (id: string) => idb.get<Blob>('blobs', id)

/** Metadata + thumbnails (no full-size blobs) for moving history between browsers. */
export async function exportHistoryJson() {
  const list = await load()
  return new Blob([JSON.stringify({ v: 1, items: list.map((h) => ({ ...h, hasBlob: false })) })], { type: 'application/json' })
}

export async function importHistoryJson(file: Blob) {
  const body = JSON.parse(await file.text()) as { items?: HistoryItem[] }
  for (const h of body.items ?? []) if (h.id && h.mode) await idb.put('history', { ...h, hasBlob: false })
  await load()
  notify()
  return body.items?.length ?? 0
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(cache ?? [])
  useEffect(() => {
    const sync = () => setItems(cache ? [...cache] : [])
    listeners.add(sync)
    load().then(sync).catch(() => undefined)
    return () => { listeners.delete(sync) }
  }, [])
  return items
}
