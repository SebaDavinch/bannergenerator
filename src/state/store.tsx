import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ModeDataMap, ModeId, StudioState } from '../types'
import { defaultModeData, defaultState } from './defaults'

const STORAGE_KEY = 'banner-studio:v2'
const MAX_LOCAL_PHOTO = 1_400_000

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Deep-merge saved data over defaults so new fields survive old saves. */
function mergeDefaults<T>(base: T, saved: unknown): T {
  if (!isObject(base) || !isObject(saved)) return (saved === undefined ? base : (saved as T))
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(base)) {
    if (key in saved) out[key] = isObject(base[key as keyof T]) ? mergeDefaults(base[key as keyof T], saved[key]) : saved[key]
  }
  return out as T
}

function load(): StudioState {
  const base = defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    return { ...mergeDefaults(base, saved), data: mergeDefaults(defaultModeData(), saved.data) }
  } catch {
    return base
  }
}

function serialize(state: StudioState) {
  // Large uploaded photos stay in memory only; everything else is persisted.
  return JSON.stringify(state, (key, value) => (key === 'local' && typeof value === 'string' && value.length > MAX_LOCAL_PHOTO ? undefined : value))
}

interface Store {
  state: StudioState
  set: (patch: Partial<Omit<StudioState, 'data'>>) => void
  update: <M extends ModeId>(mode: M, patch: Partial<ModeDataMap[M]> | ((prev: ModeDataMap[M]) => Partial<ModeDataMap[M]>)) => void
  resetMode: (mode: ModeId) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudioState>(load)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, serialize(state)) } catch { /* quota or private mode */ }
    }, 300)
  }, [state])

  const set = useCallback<Store['set']>((patch) => setState((s) => ({ ...s, ...patch })), [])

  const update = useCallback<Store['update']>((mode, patch) => {
    setState((s) => {
      const prev = s.data[mode]
      const next = typeof patch === 'function' ? patch(prev) : patch
      return { ...s, data: { ...s.data, [mode]: { ...prev, ...next } } }
    })
  }, [])

  const resetMode = useCallback((mode: ModeId) => {
    setState((s) => ({ ...s, data: { ...s.data, [mode]: defaultModeData()[mode] } }))
  }, [])

  const value = useMemo(() => ({ state, set, update, resetMode }), [state, set, update, resetMode])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}

/** Typed accessor for one mode's data + patcher. */
// eslint-disable-next-line react-refresh/only-export-components
export function useMode<M extends ModeId>(mode: M) {
  const { state, update } = useStore()
  const data = state.data[mode]
  const patch = useCallback((p: Partial<ModeDataMap[M]> | ((prev: ModeDataMap[M]) => Partial<ModeDataMap[M]>)) => update(mode, p), [mode, update])
  return [data, patch] as const
}
