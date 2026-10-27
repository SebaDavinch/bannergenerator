import { useEffect, useState } from 'react'
import type { MapTheme } from '../types'
import { apiBase } from './fleet'

export interface ProjectColors {
  /** Main brand colour: accent bar, badges, highlights. */
  primary: string
  /** Second brand colour: partner routes, map water tint. */
  secondary: string
  /** Route line colour on maps. */
  route: string
  /** Darkest brand shade, used as the base of the project map palette. */
  dark: string
}

/** A virtual airline on vAMSYS. */
export interface Project {
  id: string
  name: string
  short: string
  icao: string
  callsign: string
  /** vAMSYS airline slug, e.g. "nws" → vamsys.io/bookings/nws */
  vamsys: string
  /** Real-world airline names used for livery photo search. */
  airlines: string[]
  /** Fleet catalog key in fleet.json / backend (vAMSYS sync source). */
  fleet: string
  colors: ProjectColors
  logo: string
  logoHeight: number
  mapTheme: MapTheme
  builtIn?: boolean
  hidden?: boolean
}

export const BUILT_IN_PROJECTS: Project[] = [
  {
    id: 'nws', name: 'Nordwind Virtual', short: 'vNWS', icao: 'NWS', callsign: 'NWS', vamsys: 'nws', fleet: 'vnws',
    airlines: ['Nordwind Airlines', 'Pegas Fly'],
    colors: { primary: '#E31E24', secondary: '#8FB4FF', route: '#FF4E57', dark: '#0D1018' },
    logo: '/brand/nordwind-logo.png', logoHeight: 74, mapTheme: 'night', builtIn: true,
  },
  {
    id: 'rag', name: 'Russian Airways Group', short: 'RAG', icao: 'RAG', callsign: 'RAG', vamsys: 'rag', fleet: 'rag',
    airlines: ['Rossiya Airlines', 'Aeroflot', 'Pobeda'],
    colors: { primary: '#3C8DFF', secondary: '#BFD845', route: '#5EE2F2', dark: '#0B1220' },
    logo: '/brand/rag-logo.png', logoHeight: 64, mapTheme: 'night', builtIn: true,
  },
  {
    id: 'kar', name: 'IKAR Virtual', short: 'IKAR', icao: 'KAR', callsign: 'KAR', vamsys: 'nws', fleet: 'vnws',
    airlines: ['Ikar', 'Pegas Fly'],
    colors: { primary: '#2563EB', secondary: '#F59E0B', route: '#60A5FA', dark: '#0A1020' },
    logo: '', logoHeight: 64, mapTheme: 'atlas', builtIn: true,
  },
  {
    id: 'stw', name: 'Southwind Virtual', short: 'Southwind', icao: 'STW', callsign: 'STW', vamsys: 'nws', fleet: 'vnws',
    airlines: ['Southwind Airlines'],
    colors: { primary: '#F97316', secondary: '#22D3EE', route: '#FB923C', dark: '#140C08' },
    logo: '', logoHeight: 64, mapTheme: 'dusk', builtIn: true,
  },
]

const KEY = 'banner-studio:projects'
const listeners = new Set<() => void>()
let custom: Project[] = readLocal()
let overrides: Record<string, Partial<Project>> = readOverrides()
let backendOk: boolean | null = null

function readLocal(): Project[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function readOverrides(): Record<string, Partial<Project>> {
  try { return JSON.parse(localStorage.getItem(`${KEY}:overrides`) || '{}') } catch { return {} }
}

export function allProjects(): Project[] {
  return [...BUILT_IN_PROJECTS.map((p) => ({ ...p, ...overrides[p.id], builtIn: true })), ...custom]
}

export function projectById(id: string): Project {
  return allProjects().find((p) => p.id === id) ?? BUILT_IN_PROJECTS[0]
}

async function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(custom))
    localStorage.setItem(`${KEY}:overrides`, JSON.stringify(overrides))
  } catch { /* quota */ }
  if (backendOk) {
    // Shared team registry on the backend (file-backed).
    await fetch(`${apiBase()}/projects`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ custom, overrides }),
    }).catch(() => undefined)
  }
  listeners.forEach((l) => l())
}

export function saveProject(p: Project) {
  if (BUILT_IN_PROJECTS.some((b) => b.id === p.id)) {
    const { builtIn: _b, ...rest } = p
    void _b
    overrides = { ...overrides, [p.id]: rest }
  } else if (custom.some((c) => c.id === p.id)) custom = custom.map((c) => (c.id === p.id ? p : c))
  else custom = [...custom, p]
  return persist()
}

export function deleteProject(id: string) {
  if (BUILT_IN_PROJECTS.some((b) => b.id === id)) {
    const { [id]: _, ...rest } = overrides
    void _
    overrides = rest
  } else custom = custom.filter((c) => c.id !== id)
  return persist()
}

async function syncFromBackend() {
  try {
    const res = await fetch(`${apiBase()}/projects`, { signal: AbortSignal.timeout(2500) })
    backendOk = res.ok
    if (!res.ok) return
    const body = await res.json()
    if (Array.isArray(body.custom)) custom = body.custom
    if (body.overrides && typeof body.overrides === 'object') overrides = body.overrides
    listeners.forEach((l) => l())
  } catch {
    backendOk = false
  }
}

export function useProjects() {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    if (backendOk === null) void syncFromBackend()
    return () => { listeners.delete(l) }
  }, [])
  const list = allProjects()
  return { projects: list, visible: list.filter((p) => !p.hidden), save: saveProject, remove: deleteProject }
}

export function newProject(): Project {
  return {
    id: `p${Date.now().toString(36)}`, name: 'New Virtual Airline', short: 'NEW', icao: 'NEW', callsign: 'NEW', vamsys: '', fleet: '',
    airlines: [], colors: { primary: '#10B981', secondary: '#F59E0B', route: '#34D399', dark: '#08130F' },
    logo: '', logoHeight: 64, mapTheme: 'brand',
  }
}

/** Airport-network bit for the bundled vAMSYS airport catalogs (only the synced projects have one). */
export const networkBit = (p: Project) => (p.fleet === 'rag' ? 2 : p.fleet === 'vnws' ? 1 : 0)
