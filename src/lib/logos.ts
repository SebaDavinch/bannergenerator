import { useCallback, useEffect, useState } from 'react'
import { asset } from './asset'
import { allProjects, useProjects } from '../data/projects'

export interface LogoItem { id: string; name: string; src: string; builtIn?: boolean }

const KEY = 'banner-studio:logos'
const BUILT_IN: LogoItem[] = [{ id: 'vatsim', name: 'VATSIM', src: asset('brand/vatsim-logo.png'), builtIn: true }]

/** Every vAMSYS project that has artwork shows up in the library. */
const projectLogos = (): LogoItem[] => allProjects().filter((p) => p.logo).map((p) => ({ id: p.id, name: p.name, src: p.logo, builtIn: true }))

const listeners = new Set<() => void>()

function read(): LogoItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

/**
 * Partner / vACC / division logos. Official VATSIM subdivision artwork isn't
 * redistributable from here, so the library holds built-ins plus whatever the
 * team uploads (kept in this browser). Files dropped into /public/logos/ and
 * listed in /public/logos/index.json are picked up automatically too.
 */
export function useLogos() {
  useProjects()
  const [custom, setCustom] = useState<LogoItem[]>(read)
  const [shipped, setShipped] = useState<LogoItem[]>([])

  useEffect(() => {
    const sync = () => setCustom(read())
    listeners.add(sync)
    fetch(`${import.meta.env.BASE_URL}logos/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string; file: string }[]) =>
        setShipped(list.map((l) => ({ id: `pub:${l.id}`, name: l.name, src: `${import.meta.env.BASE_URL}logos/${l.file}`, builtIn: true }))))
      .catch(() => undefined)
    return () => { listeners.delete(sync) }
  }, [])

  const save = useCallback((next: LogoItem[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota */ }
    listeners.forEach((l) => l())
  }, [])

  const add = useCallback((item: Omit<LogoItem, 'id'>) => save([...read(), { ...item, id: `u${Date.now().toString(36)}` }]), [save])
  const remove = useCallback((id: string) => save(read().filter((l) => l.id !== id)), [save])

  return { logos: [...BUILT_IN, ...projectLogos(), ...shipped, ...custom], add, remove }
}
