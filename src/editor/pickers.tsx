import { useMemo, useRef, useState } from 'react'
import { Radar, X } from 'lucide-react'
import { useAirportDb } from '../data/airports'
import { REGION_PRESETS, divisionGroups, useVatsimDb, type Fir } from '../data/vatsim'
import { useLogos } from '../lib/logos'
import { fileToDataUrl } from '../photos/image'
import { useStore } from '../state/store'
import { UI } from '../i18n'
import { AirportPicker } from '../ui/AirportPicker'
import { Combobox } from '../ui/Combobox'
import { Button, Chip, Flag } from '../ui/controls'

/** Chip list of airports with an add-by-search box. */
export function AirportList({ value, onChange, max = 12, placeholder }: { value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string }) {
  const db = useAirportDb()
  const [key, setKey] = useState(0)
  return (
    <div className="stack">
      {value.length > 0 && (
        <div className="chips">
          {value.map((icao) => {
            const a = db?.byIcao.get(icao)
            return (
              <span className="chip chip--static" key={icao}>
                <Flag cc={a?.country} /> <b className="mono">{icao}</b> {a && <span className="muted">{a.city}</span>}
                <button type="button" className="chip__x" onClick={() => onChange(value.filter((v) => v !== icao))} aria-label="remove"><X size={12} /></button>
              </span>
            )
          })}
        </div>
      )}
      {value.length < max && (
        <AirportPicker key={key} value="" placeholder={placeholder} onPick={(a) => { if (!value.includes(a.icao)) onChange([...value, a.icao]); setKey((k) => k + 1) }} />
      )}
    </div>
  )
}

export function FirPicker({ value, onChange, divisions, multi = true }: { value: string[]; onChange: (v: string[]) => void; divisions?: string[]; multi?: boolean }) {
  const db = useVatsimDb()
  const { state } = useStore()
  const t = UI[state.locale]
  const [query, setQuery] = useState('')
  const items = useMemo(() => {
    if (!db) return []
    const q = query.trim().toLowerCase()
    return db.firs
      .filter((f) => !f.sector && (!divisions?.length || divisions.includes(f.division)))
      .filter((f) => !q || f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
      .slice(0, 14)
  }, [db, query, divisions])
  const toggle = (id: string) => onChange(multi ? (value.includes(id) ? value.filter((v) => v !== id) : [...value, id]) : [id])
  const presets = REGION_PRESETS.filter((p) => !divisions?.length || divisions.includes(p.division))
  // vACC-level groups (FIRs by country) for the chosen divisions.
  const groups = useMemo(() => (db && multi && divisions?.length ? divisions.flatMap((d) => divisionGroups(db, d)) : []), [db, divisions, multi])

  return (
    <div className="stack">
      <div className="chips">
        {presets.map((p) => {
          const on = p.firs.every((f) => value.includes(f))
          return (
            <Chip key={p.id} active={on} title={p.firs.join(' · ')}
              onClick={() => onChange(multi ? (on ? value.filter((v) => !p.firs.includes(v)) : [...new Set([...value, ...p.firs])]) : [p.firs[0]])}>
              {p[state.locale]}
            </Chip>
          )
        })}
      </div>
      {groups.length > 0 && (
        <div className="chips chips--groups">
          {groups.map((g) => {
            const ids = g.firs.map((f) => f.id)
            const on = ids.every((id) => value.includes(id))
            return (
              <Chip key={g.country} active={on} title={ids.join(' · ')}
                onClick={() => onChange(on ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])])}>
                {g.country} <span className="chip__count">{ids.length}</span>
              </Chip>
            )
          })}
        </div>
      )}
      <Combobox<Fir>
        value={query}
        onInput={setQuery}
        items={items}
        mono
        placeholder={t.firSearch}
        leading={<Radar size={15} strokeWidth={1.9} />}
        renderItem={(f) => (
          <div className="ap-row">
            <span className="ap-row__icao">{f.id}</span>
            <span className="ap-row__name"><span className="ap-row__title">{f.name}</span><span className="ap-row__city">{f.division}{f.oceanic ? ' · oceanic' : ''}</span></span>
            {value.includes(f.id) && <span className="ap-row__tag ap-row__tag--nws">✓</span>}
          </div>
        )}
        onPick={(f) => { toggle(f.id); setQuery('') }}
      />
      {multi && value.length > 0 && (
        <div className="chips">
          {value.map((id) => (
            <span className="chip chip--static" key={id}>
              <b className="mono">{id}</b> <span className="muted">{db?.firById.get(id)?.name}</span>
              <button type="button" className="chip__x" onClick={() => onChange(value.filter((v) => v !== id))} aria-label="remove"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function DivisionPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const db = useVatsimDb()
  const { state } = useStore()
  return (
    <div className="chips">
      {(db?.divisions ?? []).map((d) => (
        <Chip key={d.id} active={value.includes(d.id)} title={`${d[state.locale]} · ${d.firCount} FIR`}
          onClick={() => onChange(value.includes(d.id) ? value.filter((v) => v !== d.id) : [...value, d.id])}>
          {d.id}
        </Chip>
      ))}
    </div>
  )
}

export function LogoPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { logos, add, remove } = useLogos()
  const { state } = useStore()
  const t = UI[state.locale]
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="logo-lib">
      {logos.map((l) => (
        <button type="button" key={l.id} className={`logo-lib__item ${value.includes(l.id) ? 'is-active' : ''}`} title={l.name}
          onClick={() => onChange(value.includes(l.id) ? value.filter((v) => v !== l.id) : [...value, l.id])}>
          <img src={l.src} alt={l.name} />
          <span>{l.name}</span>
          {!l.builtIn && <span className="logo-lib__del" role="button" onClick={(e) => { e.stopPropagation(); remove(l.id); onChange(value.filter((v) => v !== l.id)) }}><X size={12} /></span>}
        </button>
      ))}
      <Button size="sm" onClick={() => file.current?.click()}>+ {t.addLogo}</Button>
      <input ref={file} type="file" accept="image/png,image/svg+xml,image/webp" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        const src = f.type === 'image/svg+xml'
          ? await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(f) })
          : await fileToDataUrl(f, 800)
        add({ name: f.name.replace(/\.[a-z]+$/i, ''), src })
        e.target.value = ''
      }} />
    </div>
  )
}
