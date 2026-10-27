import { useMemo, useState } from 'react'
import { Plane } from 'lucide-react'
import { fleetTypes, searchFleet, useFleet } from '../data/fleet'
import { typeName } from '../photos/aircraft'
import { useStore } from '../state/store'
import { projectById } from '../data/projects'
import type { AircraftRef } from '../types'
import { UI } from '../i18n'
import { Combobox } from './Combobox'
import { Chip, Field, Grid, TextInput } from './controls'

/** Registration search over the selected VA's vAMSYS fleet; picking fills type + model. */
export function AircraftPicker({ value, onChange }: { value: AircraftRef; onChange: (a: AircraftRef) => void }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const fleet = useFleet()
  const [query, setQuery] = useState<string | null>(null)
  const project = projectById(state.brand)
  const items = useMemo(() => (fleet ? searchFleet(fleet, query ?? '', project, 12) : []), [fleet, query, project])
  const types = useMemo(() => (fleet ? fleetTypes(fleet, project) : []), [fleet, project])
  const va = project.short

  return (
    <div className="stack">
      <Field label={`${t.registrationReg} · ${t.fleetOf} ${va}`}>
        <Combobox
          value={query ?? value.reg}
          onInput={(v) => setQuery(v.toUpperCase())}
          items={items}
          mono
          placeholder={t.regSearch}
          leading={<Plane size={15} strokeWidth={1.9} />}
          renderItem={(a) => (
            <div className="ap-row">
              <span className="ap-row__icao">{a.reg}</span>
              <span className="ap-row__iata">{a.type}</span>
              <span className="ap-row__name"><span className="ap-row__title">{a.model}</span><span className="ap-row__city">{a.fleet}{a.pax ? ` · ${a.pax} ${t.pax}` : ''}</span></span>
            </div>
          )}
          onPick={(a) => { setQuery(null); onChange({ reg: a.reg, type: a.type, model: a.model || typeName(a.type), va: state.brand }) }}
        />
      </Field>
      {types.length > 0 && (
        <div className="chips">
          {types.map((ty) => (
            <Chip key={ty.type} active={value.type === ty.type && !value.reg} title={ty.model}
              onClick={() => onChange({ reg: '', type: ty.type, model: typeName(ty.type), va: state.brand })}>
              {ty.type} <span className="chip__count">{ty.count}</span>
            </Chip>
          ))}
        </div>
      )}
      <Grid>
        <Field label={t.model}><TextInput value={value.model} onValue={(v) => onChange({ ...value, model: v })} placeholder="Boeing 737-800" /></Field>
        <Field label={t.type}><TextInput mono value={value.type} onValue={(v) => onChange({ ...value, type: v.toUpperCase() })} placeholder="B738" /></Field>
      </Grid>
    </div>
  )
}
