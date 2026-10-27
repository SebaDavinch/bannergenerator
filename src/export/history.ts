import { useEffect, useState } from 'react'
import type { Brand, ModeId } from '../types'

export interface HistoryItem {
  id: string
  at: string
  mode: ModeId
  brand: Brand
  title: string
  thumb: string
  data: unknown
}

const KEY = 'banner-studio:history'
const MAX = 16
const listeners = new Set<() => void>()

export function readHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function pushHistory(item: Omit<HistoryItem, 'id' | 'at'>) {
  const next = [{ ...item, id: Date.now().toString(36), at: new Date().toISOString() }, ...readHistory()].slice(0, MAX)
  // Drop oldest entries until it fits the storage quota.
  for (let n = next.length; n > 0; n--) {
    try { localStorage.setItem(KEY, JSON.stringify(next.slice(0, n))); break } catch { /* shrink */ }
  }
  listeners.forEach((l) => l())
}

export function removeHistory(id: string) {
  localStorage.setItem(KEY, JSON.stringify(readHistory().filter((h) => h.id !== id)))
  listeners.forEach((l) => l())
}

export function useHistory() {
  const [items, setItems] = useState(readHistory)
  useEffect(() => {
    const sync = () => setItems(readHistory())
    listeners.add(sync)
    return () => { listeners.delete(sync) }
  }, [])
  return items
}
