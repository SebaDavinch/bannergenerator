import { useMemo, useState } from 'react'
import { ExternalLink, Plane } from 'lucide-react'
import { fleetTypes, searchFleet, useFleet, type FleetAircraft } from '../data/fleet'
import { typeName } from '../photos/aircraft'
import { useStore } from '../state/store'
import { projectById } from '../data/projects'
import type { AircraftRef } from '../types'
import { UI } from '../i18n'
import { Combobox } from './Combobox'
import { Chip, Field, Grid, TextInput } from './controls'

const norm = (s: string) => s.toUpperCase().replace(/[\s-]/g, '')
const cleanReg = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '')

/**
 * Registration of the exact aircraft for the banner. Any registration can be
 * typed (Enter / leaving the field accepts it); the project's vAMSYS fleet is
 * offered as suggestions and fills type + model. A set registration drives the
 * photo search (JetPhotos via backend, Planespotters, Commons).
 */
export function AircraftPicker({ value, onChange }: { value: AircraftRef; onChange: (a: AircraftRef) => void }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const fleet = useFleet()
  const [query, setQuery] = useState<string | null>(null)
  const project = projectById(state.brand)

  const items = useMemo(() => {
    const found = fleet ? searchFleet(fleet, query ?? '', project, 12) : []
    const typed = cleanReg(query ?? '')
    // A registration outside the fleet is still allowed: offer it as the first row.
    if (typed.length >= 4 && !found.some((a) => norm(a.reg) === norm(typed))) {
      found.unshift({ va: '', reg: typed, type: '', model: '', fleet: t.otherAircraft, kind: '', pax: null, image: null })
    }
    return found
  }, [fleet, query, project, t.otherAircraft])
  const types = useMemo(() => (fleet ? fleetTypes(fleet, project) : []), [fleet, project])

  const commit = (reg: string) => {
    setQuery(null)
    const r = cleanReg(reg)
    if (!r || r === value.reg) return
    const known = fleet?.find((a) => a.va === project.fleet && norm(a.reg) === norm(r))
    onChange(known
      ? { reg: known.reg, type: known.type, model: known.model || typeName(known.type), va: state.brand }
      : { ...value, reg: r, va: state.brand })
  }
  const pick = (a: FleetAircraft) => (a.va ? onChange({ reg: a.reg, type: a.type, model: a.model || typeName(a.type), va: state.brand }) : commit(a.reg))

  return (
    <div className="stack">
      <Field label={t.registrationReg} hint={`${t.fleetOf} ${project.short}: ${t.regHint}`}>
        <Combobox
          value={query ?? value.reg}
          onInput={(v) => setQuery(v.toUpperCase())}
          onCommit={(v) => { if (query !== null) commit(v) }}
          items={items}
          mono
          placeholder={t.regSearch}
          leading={<Plane size={15} strokeWidth={1.9} />}
          renderItem={(a) => (
            <div className="ap-row">
              <span className="ap-row__icao">{a.reg}</span>
              {a.type && <span className="ap-row__iata">{a.type}</span>}
              <span className="ap-row__name"><span className="ap-row__title">{a.model || a.fleet}</span>{a.model && <span className="ap-row__city">{a.fleet}{a.pax ? ` · ${a.pax} ${t.pax}` : ''}</span>}</span>
            </div>
          )}
          onPick={(a) => { setQuery(null); pick(a) }}
        />
      </Field>
      {value.reg && (
        <div className="reg-links">
          <a href={`https://www.jetphotos.com/registration/${encodeURIComponent(value.reg)}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> JetPhotos · {value.reg}</a>
          <a href={`https://www.planespotters.net/photos/reg/${encodeURIComponent(value.reg)}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Planespotters · {value.reg}</a>
        </div>
      )}
      {types.length > 0 && (
        <Field label={t.orTypeOnly}>
          <div className="chips">
            {types.map((ty) => (
              <Chip key={ty.type} active={value.type === ty.type && !value.reg} title={ty.model}
                onClick={() => onChange({ reg: '', type: ty.type, model: typeName(ty.type), va: state.brand })}>
                {ty.type} <span className="chip__count">{ty.count}</span>
              </Chip>
            ))}
          </div>
        </Field>
      )}
      <Grid>
        <Field label={t.model}><TextInput value={value.model} onValue={(v) => onChange({ ...value, model: v })} placeholder="Boeing 737-800" /></Field>
        <Field label={t.type}><TextInput mono value={value.type} onValue={(v) => onChange({ ...value, type: v.toUpperCase() })} placeholder="B738" /></Field>
      </Grid>
    </div>
  )
}
