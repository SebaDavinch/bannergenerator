import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { greatCircleNm, useAirportDb } from '../data/airports'
import { UI } from '../i18n'
import { useStore } from '../state/store'
import type { Leg } from '../types'
import { LegsEditor } from '../ui/LegsEditor'
import { GallerySlot } from './gallerySlot'

export interface RouteTrack {
  key: string
  label?: string
  accent?: string
  legs: Leg[]
  onChange: (legs: Leg[]) => void
  withNote?: boolean
}

const icaosOf = (legs: Leg[]) => new Set(legs.flatMap((l) => [l.from, l.to]).filter(Boolean))

/** Full-width route editor under the preview (inline in the form when there is no slot). */
export function RouteBoard({ title, tracks, actions }: { title?: string; tracks: RouteTrack[]; actions?: ReactNode }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const db = useAirportDb()
  const slot = useContext(GallerySlot)

  const all = tracks.flatMap((x) => x.legs)
  const nm = all.reduce((sum, l) => {
    const a = db?.byIcao.get(l.from)
    const b = db?.byIcao.get(l.to)
    return a && b ? sum + greatCircleNm(a, b) : sum
  }, 0)
  const airports = icaosOf(all)
  // Airports flown by every track: where the projects' networks meet.
  const shared = tracks.length > 1
    ? [...icaosOf(tracks[0].legs)].filter((icao) => tracks.slice(1).every((x) => icaosOf(x.legs).has(icao)))
    : []

  const panel = (
    <section className="gallery route-board">
      <header className="gallery__head">
        <span className="gallery__title">{title ?? t.routeBoard}</span>
        <span className="gallery__count">{all.length} {t.legsShort} · {airports.size} {t.airportsShort} · {Math.round(nm).toLocaleString('ru-RU')} nm</span>
        {actions && <div className="gallery__actions">{actions}</div>}
      </header>
      <div className={`route-board__tracks ${tracks.length > 1 ? 'route-board__tracks--multi' : ''}`}>
        {tracks.map((x) => (
          <div className="route-board__track" key={x.key} style={x.accent ? { ['--track' as string]: x.accent } : undefined}>
            {x.label && <div className="route-board__label"><span className="route-board__dot" />{x.label}</div>}
            <LegsEditor legs={x.legs} onChange={x.onChange} withNote={x.withNote} accent={x.accent} />
          </div>
        ))}
      </div>
      {shared.length > 0 && (
        <div className="route-board__shared">
          <span>{t.sharedAirports}</span>
          {shared.map((icao) => <b key={icao}>{icao}</b>)}
        </div>
      )}
    </section>
  )
  return slot ? createPortal(panel, slot) : panel
}
