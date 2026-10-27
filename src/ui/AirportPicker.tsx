import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { searchAirports, useAirportDb, type AirportRecord } from '../data/airports'
import { useStore } from '../state/store'
import { networkBit, projectById } from '../data/projects'
import { Combobox } from './Combobox'
import { Flag } from './controls'

function AirportRow({ a, compact }: { a: AirportRecord; compact?: boolean }) {
  return (
    <div className="ap-row">
      <Flag cc={a.country} />
      <span className="ap-row__icao">{a.icao}</span>
      {a.iata && <span className="ap-row__iata">{a.iata}</span>}
      <span className="ap-row__name">
        <span className="ap-row__title">{a.name}</span>
        {!compact && <span className="ap-row__city">{a.city}{a.city && ', '}{a.country}</span>}
      </span>
      {a.network & 1 ? <span className="ap-row__tag ap-row__tag--nws">vNWS</span> : null}
      {a.network & 2 ? <span className="ap-row__tag ap-row__tag--rag">RAG</span> : null}
    </div>
  )
}

/**
 * Airport search by ICAO / IATA / city / name (incl. Russian aliases).
 * `value` is the committed ICAO; typing edits a local query until a pick.
 */
export function AirportPicker({ value, onPick, placeholder, compact, autoFocus }: {
  value: string
  onPick: (a: AirportRecord) => void
  placeholder?: string
  compact?: boolean
  autoFocus?: boolean
}) {
  const db = useAirportDb()
  const { state } = useStore()
  const [query, setQuery] = useState<string | null>(null)
  const text = query ?? value
  const items = useMemo(() => (db && query ? searchAirports(db, query, { networkBit: networkBit(projectById(state.brand)), limit: compact ? 8 : 12 }) : []), [db, query, state.brand, compact])
  const current = db?.byIcao.get(value)

  return (
    <Combobox
      value={text}
      onInput={(v) => setQuery(v)}
      items={items}
      mono={compact}
      autoFocus={autoFocus}
      placeholder={placeholder}
      leading={compact ? (current ? <Flag cc={current.country} /> : null) : <Search size={15} strokeWidth={1.9} />}
      renderItem={(a) => <AirportRow a={a} compact={compact} />}
      onPick={(a) => { setQuery(null); onPick(a) }}
      footer={db ? undefined : <span className="muted">…</span>}
    />
  )
}

export function AirportSummary({ icao }: { icao: string }) {
  const db = useAirportDb()
  const a = db?.byIcao.get(icao)
  if (!a) return null
  return (
    <div className="ap-summary">
      <Flag cc={a.country} />
      <div>
        <div className="ap-summary__name">{a.fullName}</div>
        <div className="ap-summary__meta">
          {a.icao}{a.iata && ` · ${a.iata}`} · {a.city}, {a.country} · {a.lat.toFixed(3)}°, {a.lon.toFixed(3)}°
        </div>
      </div>
    </div>
  )
}
