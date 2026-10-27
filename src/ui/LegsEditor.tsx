import { useState } from 'react'
import { ArrowRight, ClipboardList, Plus, X } from 'lucide-react'
import { greatCircleNm, useAirportDb } from '../data/airports'
import { legsFrom, uid } from '../state/defaults'
import { useStore } from '../state/store'
import type { Leg } from '../types'
import { UI } from '../i18n'
import { AirportPicker } from './AirportPicker'
import { Button, TextArea, TextInput } from './controls'

export function LegsEditor({ legs, onChange, withNote, accent }: { legs: Leg[]; onChange: (legs: Leg[]) => void; withNote?: boolean; accent?: string }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const db = useAirportDb()
  const [bulk, setBulk] = useState<string | null>(null)

  const patch = (id: string, p: Partial<Leg>) => onChange(legs.map((l) => (l.id === id ? { ...l, ...p } : l)))
  const add = () => {
    const last = legs[legs.length - 1]
    onChange([...legs, { id: uid(), from: last?.to ?? '', to: '' }])
  }
  const total = legs.reduce((sum, l) => {
    const a = db?.byIcao.get(l.from)
    const b = db?.byIcao.get(l.to)
    return a && b ? sum + greatCircleNm(a, b) : sum
  }, 0)

  return (
    <div className="legs" style={accent ? { ['--leg-accent' as string]: accent } : undefined}>
      {legs.map((leg, i) => {
        const a = db?.byIcao.get(leg.from)
        const b = db?.byIcao.get(leg.to)
        const nm = a && b ? Math.round(greatCircleNm(a, b)) : null
        return (
          <div className={`leg ${withNote ? 'leg--note' : ''}`} key={leg.id}>
            <span className="leg__index">{String(i + 1).padStart(2, '0')}</span>
            <AirportPicker compact value={leg.from} placeholder="ICAO" onPick={(ap) => patch(leg.id, { from: ap.icao })} />
            <ArrowRight size={14} className="leg__arrow" />
            <AirportPicker compact value={leg.to} placeholder="ICAO" onPick={(ap) => patch(leg.id, { to: ap.icao })} />
            {withNote && <TextInput mono value={leg.note ?? ''} placeholder={t.legNote} onValue={(v) => patch(leg.id, { note: v.toUpperCase() })} />}
            <span className="leg__nm">{nm !== null ? `${nm} nm` : (leg.from && leg.to ? t.unknownAirport : '')}</span>
            <Button variant="ghost" size="sm" icon={X} aria-label="remove" onClick={() => onChange(legs.filter((l) => l.id !== leg.id))} />
          </div>
        )
      })}
      <div className="legs__footer">
        <Button size="sm" icon={Plus} onClick={add}>{t.addLeg}</Button>
        <Button size="sm" variant="ghost" icon={ClipboardList} onClick={() => setBulk(bulk === null ? legs.map((l) => `${l.from}-${l.to}${l.note ? ` ${l.note}` : ''}`).join('\n') : null)}>{t.pasteLegs}</Button>
        <span className="legs__total">{legs.length} · {Math.round(total).toLocaleString('ru-RU')} nm</span>
      </div>
      {bulk !== null && (
        <div className="legs__bulk">
          <TextArea value={bulk} onValue={setBulk} placeholder={t.pasteLegsHint} rows={5} className="input--mono" />
          <Button size="sm" variant="primary" onClick={() => { onChange(legsFrom(bulk)); setBulk(null) }}>{t.apply}</Button>
        </div>
      )}
    </div>
  )
}
