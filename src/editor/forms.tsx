import { useCallback } from 'react'
import {
  Award, Building2, CalendarClock, Clapperboard, Gauge, Globe2, Images, MapPinned, Plane, Plus, Radar, RefreshCw, Shuffle, Ticket, Type, Users, X,
} from 'lucide-react'
import { toRef, useAirportDb } from '../data/airports'
import { useVatsimDb } from '../data/vatsim'
import { projectById, useProjects } from '../data/projects'
import { MapOptions } from './MapOptions'
import { RouteBoard } from './RouteBoard'
import type { MapView } from '../types'
import { searchAircraftPhotos } from '../photos/aircraft'
import { searchLandmarks, searchMood } from '../photos/landmarks'
import { uid } from '../state/defaults'
import { useMode, useStore } from '../state/store'
import type { ChallengeScene, CountType, GoalScene, Leg, PhotoState, VatsimEventKind, VisualMode } from '../types'
import { COUNT_TYPES, UI, type UiCopy } from '../i18n'
import { AircraftPicker } from '../ui/AircraftPicker'
import { AirportPicker, AirportSummary } from '../ui/AirportPicker'
import { Button, Card, Field, Grid, Segmented, Select, Slider, Switch, TextArea, TextInput } from '../ui/controls'
import { PhotoPicker } from '../ui/PhotoPicker'
import { AirportList, DivisionPicker, FirPicker, LogoPicker } from './pickers'

const useT = () => UI[useStore().state.locale]

function MapCard({ view, onChange }: { view: MapView; onChange: (v: MapView) => void }) {
  const t = useT()
  return (
    <Card title={t.mapCard} icon={MapPinned} hint={t.mapHint}>
      <MapOptions view={view} set={(p) => onChange({ ...view, ...p })} />
    </Card>
  )
}

function ProjectPair({ value, onChange }: { value: [string, string]; onChange: (v: [string, string]) => void }) {
  const t = useT()
  const { visible } = useProjects()
  const opts = visible.map((p) => ({ value: p.id, label: `${p.short} — ${p.name}` }))
  return (
    <Grid>
      <Field label={t.partnerA}><Select value={value[0]} onChange={(v) => onChange([v, value[1]])} options={opts} /></Field>
      <Field label={t.partnerB}><Select value={value[1]} onChange={(v) => onChange([value[0], v])} options={opts} /></Field>
    </Grid>
  )
}

function RewardCard({ value, onChange, t, withPeriod = true }: {
  value: { bonusPoints: string; registrationRequired: boolean; period: string }
  onChange: (p: Partial<{ bonusPoints: string; registrationRequired: boolean; period: string }>) => void
  t: UiCopy
  withPeriod?: boolean
}) {
  return (
    <Card title={t.reward} icon={Award}>
      <Grid>
        <Field label={t.bonus}><TextInput mono inputMode="numeric" value={value.bonusPoints} onValue={(v) => onChange({ bonusPoints: v })} /></Field>
        {withPeriod && <Field label={t.period}><TextInput value={value.period} placeholder={t.periodPh} onValue={(v) => onChange({ period: v.toUpperCase() })} /></Field>}
      </Grid>
      <Switch checked={value.registrationRequired} onChange={(v) => onChange({ registrationRequired: v })} label={t.registration} />
    </Card>
  )
}

function TitleFields({ title, description, onChange, t, descPlaceholder }: { title: string; description?: string; onChange: (p: { title?: string; description?: string }) => void; t: UiCopy; descPlaceholder?: string }) {
  return (
    <>
      <Field label={t.title}><TextInput value={title} onValue={(v) => onChange({ title: v })} /></Field>
      {description !== undefined && <Field label={t.description}><TextArea rows={3} value={description} placeholder={descPlaceholder} onValue={(v) => onChange({ description: v })} /></Field>}
    </>
  )
}

const photoPatch = (photo: PhotoState, set: (p: { photo: PhotoState }) => void) => (p: Partial<PhotoState>) => set({ photo: { ...photo, ...p } })

// ── Focus ─────────────────────────────────────────────────────────────────
export function FocusForm() {
  const t = useT()
  const [d, set] = useMode('focus-airport')
  const city = d.cityOverride || d.airport?.city || ''
  const search = useCallback((signal: AbortSignal) => searchLandmarks(d.airport, city, signal).then((r) => r.photos), [d.airport, city])
  return (
    <>
      <Card title={t.airport} icon={MapPinned} hint={t.airportSearch}>
        <AirportPicker value={d.airport?.icao ?? ''} placeholder={t.airportSearch} onPick={(a) => set({ airport: toRef(a), cityOverride: '' })} />
        {d.airport && <AirportSummary icao={d.airport.icao} />}
        <Grid>
          <Field label={t.cityOverride} hint={t.cityOverrideHint}><TextInput value={d.cityOverride} placeholder={d.airport?.city} onValue={(v) => set({ cityOverride: v })} /></Field>
          <Field label={t.tagline}><TextInput value={d.tagline} placeholder={t.taglinePh} onValue={(v) => set({ tagline: v })} /></Field>
        </Grid>
      </Card>
      <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} search={search} searchKey={`${d.airport?.icao}|${city}`}
        title={t.landmarks} hint="Wikidata · Wikimedia Commons" note={false} />
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Tour ──────────────────────────────────────────────────────────────────
export function TourForm() {
  const t = useT()
  const [d, set] = useMode('tour')
  return (
    <>
      <Card title={t.basics} icon={Type}><TitleFields title={d.title} description={d.description} onChange={set} t={t} /></Card>
      <RouteBoard title={t.route} tracks={[{ key: 'tour', legs: d.legs, onChange: (legs) => set({ legs }) }]} actions={
        <Segmented size="sm" value={d.layout} onChange={(layout) => set({ layout, map: { ...d.map, numbers: layout === 'itinerary' || d.map.numbers } })}
          options={[{ value: 'chips', label: t.layoutChips }, { value: 'itinerary', label: t.layoutItinerary }]} />
      } />
      <MapCard view={d.map} onChange={(map) => set({ map })} />
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Roster / Curated ──────────────────────────────────────────────────────
export function RosterForm({ mode }: { mode: 'roster' | 'curated-roster' }) {
  const t = useT()
  const { state } = useStore()
  const [d, set] = useMode(mode)
  const search = useCallback((signal: AbortSignal) => searchAircraftPhotos({ reg: d.aircraft.reg, type: d.aircraft.type, project: projectById(state.brand) }, signal), [d.aircraft.reg, d.aircraft.type, state.brand])
  return (
    <>
      <Card title={t.basics} icon={Type}><TitleFields title={d.title} description={d.description} onChange={set} t={t} /></Card>
      <RouteBoard title={t.route} tracks={[{ key: mode, legs: d.legs, onChange: (legs: Leg[]) => set({ legs }), withNote: mode === 'curated-roster' }]} />
      <Card title={t.visual} icon={Images} actions={
        <Segmented size="sm" value={d.visual} onChange={(v: VisualMode) => set({ visual: v })}
          options={[{ value: 'aircraft', label: t.visualAircraft }, { value: 'map', label: t.visualMap }]} />
      }>
        {d.visual === 'aircraft' ? (
          <>
            <AircraftPicker value={d.aircraft} onChange={(aircraft) => set({ aircraft, photo: { ...d.photo, auto: true } })} />
            <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} title={t.aircraftPhotos} hint="Planespotters · JetPhotos · Commons" search={search}
              searchKey={d.aircraft.reg || d.aircraft.type ? `${state.brand}|${d.aircraft.reg}|${d.aircraft.type}` : ''} />
          </>
        ) : <MapOptions view={d.map} set={(p) => set({ map: { ...d.map, ...p } })} />}
      </Card>
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Challenge ─────────────────────────────────────────────────────────────
const CHALLENGE_SCENES: { value: ChallengeScene; ru: string; en: string }[] = [
  { value: 'versus', ru: 'Противостояние', en: 'Versus' },
  { value: 'runways', ru: 'Полосы', en: 'Runways' },
  { value: 'holding', ru: 'Зона ожидания', en: 'Holding' },
  { value: 'board', ru: 'Табло', en: 'Board' },
  { value: 'contrails', ru: 'Следы', en: 'Contrails' },
  { value: 'photo', ru: 'Фото', en: 'Photo' },
]

export function ChallengeForm() {
  const t = useT()
  const { state } = useStore()
  const [d, set] = useMode('community-challenge')
  const search = useCallback((signal: AbortSignal) => searchMood(d.photoQuery || 'airport night', signal), [d.photoQuery])
  const patchTeam = (id: string, p: Partial<(typeof d.teams)[number]>) => set({ teams: d.teams.map((x) => (x.id === id ? { ...x, ...p } : x)) })
  return (
    <>
      <Card title={t.basics} icon={Type}><TitleFields title={d.title} description={d.description} onChange={set} t={t} /></Card>
      <Card title={t.teams} icon={Users} hint="2–4">
        {d.teams.map((team, i) => (
          <div className="team-row" key={team.id}>
            <span className="team-row__swatch" style={{ background: ['#FF4B50', '#3CC4DC', '#BFD845', '#B060DB'][i] }} />
            <TextInput value={team.name} onValue={(v) => patchTeam(team.id, { name: v })} placeholder={t.team} />
            <Select value={team.countType} onChange={(v: CountType) => patchTeam(team.id, { countType: v })} options={COUNT_TYPES.map((c) => ({ value: c.value, label: c[state.locale] }))} />
            <TextInput mono inputMode="numeric" value={team.target} onValue={(v) => patchTeam(team.id, { target: v })} placeholder={t.target} />
            <TextInput mono inputMode="numeric" value={team.current ?? ''} onValue={(v) => patchTeam(team.id, { current: v })} placeholder={t.progressShort} />
            <Button variant="ghost" size="sm" icon={X} disabled={d.teams.length <= 2} onClick={() => set({ teams: d.teams.filter((x) => x.id !== team.id) })} aria-label="remove" />
          </div>
        ))}
        {d.teams.length < 4 && <Button size="sm" icon={Plus} onClick={() => set({ teams: [...d.teams, { id: uid(), name: `${t.teamDefault} ${d.teams.length + 1}`, countType: d.teams[0]?.countType ?? 'flights', target: d.teams[0]?.target ?? '' }] })}>{t.addTeam}</Button>}
      </Card>
      <Card title={t.visual} icon={Clapperboard}>
        <Segmented value={d.scene} onChange={(v) => set({ scene: v })} options={CHALLENGE_SCENES.map((s) => ({ value: s.value, label: s[state.locale] }))} />
        {d.scene === 'photo' && (
          <>
            <Field label={t.moodQuery}><TextInput value={d.photoQuery} placeholder={t.moodPh} onValue={(v) => set({ photoQuery: v })} /></Field>
            <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} search={search} searchKey={`mood|${d.photoQuery}`} dimDefault={0.62} />
          </>
        )}
      </Card>
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Goal ──────────────────────────────────────────────────────────────────
const GOAL_SCENES: { value: GoalScene; ru: string; en: string }[] = [
  { value: 'gauge', ru: 'Прибор', en: 'Gauge' },
  { value: 'radar', ru: 'Радар VATSIM', en: 'VATSIM radar' },
  { value: 'cockpit', ru: 'Приборы', en: 'Cockpit' },
  { value: 'approach', ru: 'Схема захода', en: 'Approach' },
  { value: 'board', ru: 'Табло', en: 'Board' },
  { value: 'contrails', ru: 'Следы', en: 'Contrails' },
]

export function GoalForm() {
  const t = useT()
  const { state } = useStore()
  const [d, set] = useMode('community-goal')
  const vatsim = useVatsimDb()
  const radar = (p: Partial<typeof d.radar>) => set({ radar: { ...d.radar, ...p } })
  const sectorCount = vatsim?.firs.filter((f) => f.parent === d.radar.fir).length ?? 0
  return (
    <>
      <Card title={t.basics} icon={Type}><TitleFields title={d.title} description={d.description} onChange={set} t={t} /></Card>
      <Card title={t.goal} icon={Gauge}>
        <Grid cols={3}>
          <Field label={t.countType}><Select value={d.countType} onChange={(v: CountType) => set({ countType: v })} options={COUNT_TYPES.map((c) => ({ value: c.value, label: c[state.locale] }))} /></Field>
          <Field label={t.target}><TextInput mono inputMode="numeric" value={d.target} onValue={(v) => set({ target: v })} /></Field>
          <Field label={t.progress}><TextInput mono inputMode="numeric" value={d.progress} placeholder={t.progressPh} onValue={(v) => set({ progress: v })} /></Field>
        </Grid>
      </Card>
      <Card title={t.visual} icon={Clapperboard} actions={<Button size="sm" variant="ghost" icon={Shuffle} onClick={() => radar({ seed: Math.floor(Math.random() * 1e6) })}>{t.reshuffle}</Button>}>
        <Segmented value={d.scene} onChange={(v) => set({ scene: v })} options={GOAL_SCENES.map((s) => ({ value: s.value, label: s[state.locale] }))} />
        {d.scene === 'radar' && (
          <>
            <Field label={t.sector}><FirPicker multi={false} value={[d.radar.fir]} onChange={(v) => radar({ fir: v[v.length - 1] ?? d.radar.fir })} /></Field>
            <p className="muted small"><Radar size={12} /> {d.radar.fir} · {vatsim?.firById.get(d.radar.fir)?.name} · {sectorCount} {t.sectorsCount}</p>
            <Grid>
              <Switch checked={d.radar.sectors} onChange={(v) => radar({ sectors: v })} label={t.sectorLines} />
              <Switch checked={d.radar.rings} onChange={(v) => radar({ rings: v })} label={t.rangeRings} />
            </Grid>
          </>
        )}
        {(d.scene === 'radar' || d.scene === 'contrails') && <Slider label={t.traffic} value={d.radar.traffic} min={0} max={14} onChange={(v) => radar({ traffic: v })} />}
      </Card>
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Slotted ───────────────────────────────────────────────────────────────
export function SlottedForm() {
  const t = useT()
  const { state } = useStore()
  const [d, set] = useMode('slotted')
  const patchWave = (id: string, p: Partial<(typeof d.waves)[number]>) => set({ waves: d.waves.map((w) => (w.id === id ? { ...w, ...p } : w)) })
  const firstTo = d.legs[0]?.to
  const db = useAirportDb()
  const dest = firstTo ? db?.byIcao.get(firstTo) : undefined
  const aircraftSearch = useCallback((signal: AbortSignal) => searchAircraftPhotos({ reg: d.aircraft.reg, type: d.aircraft.type, project: projectById(state.brand) }, signal), [d.aircraft.reg, d.aircraft.type, state.brand])
  const citySearch = useCallback((signal: AbortSignal) => searchLandmarks(dest ? toRef(dest) : null, dest?.city ?? '', signal).then((r) => r.photos), [dest])
  return (
    <>
      <Card title={t.basics} icon={Type}>
        <Field label={t.title}><TextInput value={d.title} onValue={(v) => set({ title: v })} /></Field>
        <Grid>
          <Field label={t.network}><Select value={d.network} onChange={(v) => set({ network: v })} options={['VATSIM', 'IVAO', 'POSCON', 'PilotEdge', 'Offline'].map((v) => ({ value: v, label: v }))} /></Field>
          <Field label={t.date}><TextInput value={d.date} placeholder={t.datePh} onValue={(v) => set({ date: v })} /></Field>
        </Grid>
      </Card>
      <Card title={t.booking} icon={Ticket}>
        <Field label={t.bookingUrl}>
          <div className="filename">
            <TextInput mono value={d.bookingUrl} placeholder={`https://vamsys.io/bookings/${projectById(state.brand).vamsys || 'nws'}`} onValue={(v) => set({ bookingUrl: v })} />
            {projectById(state.brand).vamsys && <Button size="sm" variant="ghost" onClick={() => set({ bookingUrl: `https://vamsys.io/bookings/${projectById(state.brand).vamsys}` })}>{projectById(state.brand).short}</Button>}
          </div>
        </Field>
        <Switch checked={d.showQr} onChange={(v) => set({ showQr: v })} label={t.qr} />
      </Card>
      <Card title={t.waves} icon={CalendarClock}>
        {d.waves.map((w) => (
          <div className="wave-row" key={w.id}>
            <TextInput value={w.label} onValue={(v) => patchWave(w.id, { label: v })} placeholder={t.wave} />
            <TextInput mono value={w.openTime} onValue={(v) => patchWave(w.id, { openTime: v.toUpperCase() })} placeholder="17:00Z" />
            <TextInput value={w.condition} onValue={(v) => patchWave(w.id, { condition: v })} placeholder={t.condition} />
            <Button variant="ghost" size="sm" icon={X} onClick={() => set({ waves: d.waves.filter((x) => x.id !== w.id) })} aria-label="remove" />
          </div>
        ))}
        {d.waves.length < 4 && <Button size="sm" icon={Plus} onClick={() => set({ waves: [...d.waves, { id: uid(), label: `${t.waveDefault} ${d.waves.length + 1}`, openTime: '', condition: '' }] })}>{t.addWave}</Button>}
      </Card>
      <RouteBoard title={t.route} tracks={[{ key: 'slotted', legs: d.legs, onChange: (legs) => set({ legs }) }]} />
      <Card title={t.visual} icon={Images} actions={
        <Segmented size="sm" value={d.visual} onChange={(v: VisualMode) => set({ visual: v })}
          options={[{ value: 'map', label: t.visualMap }, { value: 'aircraft', label: t.visualAircraft }, { value: 'photo', label: t.visualPhoto }]} />
      }>
        {d.visual === 'aircraft' && (
          <>
            <AircraftPicker value={d.aircraft} onChange={(aircraft) => set({ aircraft, photo: { ...d.photo, auto: true } })} />
            <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} title={t.aircraftPhotos} hint="Planespotters · JetPhotos · Commons" search={aircraftSearch} searchKey={d.aircraft.reg || d.aircraft.type ? `ac|${state.brand}|${d.aircraft.reg}|${d.aircraft.type}` : ''} />
          </>
        )}
        {d.visual === 'photo' && <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} title={t.cityPhotos} hint="Wikidata · Wikimedia Commons" search={citySearch} searchKey={`city|${dest?.icao ?? ''}`} />}
        {d.visual === 'map' && <MapOptions view={d.map} set={(p) => set({ map: { ...d.map, ...p } })} />}
      </Card>
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}

// ── Collab ────────────────────────────────────────────────────────────────
export function CollabForm() {
  const t = useT()
  const [d, set] = useMode('event')
  const a = projectById(d.projects?.[0] ?? 'nws')
  const b = projectById(d.projects?.[1] ?? 'rag')
  const focus = d.layout === 'focus'
  const city = d.cityOverride || d.airport?.city || ''
  const search = useCallback((signal: AbortSignal) => searchLandmarks(d.airport, city, signal).then((r) => r.photos), [d.airport, city])
  return (
    <>
      <Card title={t.projects} icon={Building2} actions={
        <Segmented size="sm" value={d.layout} onChange={(layout) => set({ layout })}
          options={[{ value: 'routes', label: t.layoutRoutes }, { value: 'focus', label: t.layoutFocus }]} />
      }><ProjectPair value={d.projects ?? ['nws', 'rag']} onChange={(projects) => set({ projects })} /></Card>
      <Card title={t.basics} icon={Type}>
        <TitleFields title={d.title} description={focus ? undefined : d.description} onChange={set} t={t} />
        <Grid>
          <Field label={t.partners}><TextInput value={d.partners} onValue={(v) => set({ partners: v })} /></Field>
          <Field label={t.period}><TextInput value={d.period} placeholder={t.periodPh} onValue={(v) => set({ period: v.toUpperCase() })} /></Field>
        </Grid>
      </Card>
      {focus ? (
        <>
          <Card title={t.airport} icon={MapPinned} hint={t.airportSearch}>
            <AirportPicker value={d.airport?.icao ?? ''} placeholder={t.airportSearch} onPick={(ap) => set({ airport: toRef(ap), cityOverride: '' })} />
            {d.airport && <AirportSummary icao={d.airport.icao} />}
            <Grid>
              <Field label={t.cityOverride} hint={t.cityOverrideHint}><TextInput value={d.cityOverride} placeholder={d.airport?.city} onValue={(v) => set({ cityOverride: v })} /></Field>
              <Field label={t.tagline}><TextInput value={d.tagline} placeholder={d.title || t.taglinePh} onValue={(v) => set({ tagline: v })} /></Field>
            </Grid>
          </Card>
          <PhotoPicker photo={d.photo} onChange={photoPatch(d.photo, set)} search={search} searchKey={`${d.airport?.icao}|${city}`}
            title={t.landmarks} hint="Wikidata · Wikimedia Commons" note={false} />
        </>
      ) : (
        <>
          <RouteBoard tracks={[
            { key: 'a', label: `${t.legs} ${a.short}`, accent: a.colors.route, legs: d.vnwsLegs, onChange: (vnwsLegs) => set({ vnwsLegs }) },
            { key: 'b', label: `${t.legs} ${b.short}`, accent: b.colors.route, legs: d.ragLegs, onChange: (ragLegs) => set({ ragLegs }) },
          ]} />
        </>
      )}
      <Card title={t.reward} icon={Award} actions={
        <Segmented size="sm" value={d.pointsMode} onChange={(pointsMode) => set({ pointsMode })}
          options={[{ value: 'split', label: t.pointsSplit }, { value: 'merged', label: t.pointsMerged }]} />
      }>
        {d.pointsMode === 'merged' ? (
          <>
            <Field label={`${t.bonus} ${a.short} × ${b.short}`}><TextInput mono inputMode="numeric" value={d.bonus} onValue={(v) => set({ bonus: v })} /></Field>
            <Switch checked={d.registration} onChange={(v) => set({ registration: v })} label={t.registration} />
          </>
        ) : (
          <>
            <Grid>
              <Field label={`${t.bonus} ${a.short}`}><TextInput mono inputMode="numeric" value={d.vnwsBonus} onValue={(v) => set({ vnwsBonus: v })} /></Field>
              <Field label={`${t.bonus} ${b.short}`}><TextInput mono inputMode="numeric" value={d.ragBonus} onValue={(v) => set({ ragBonus: v })} /></Field>
            </Grid>
            <Grid>
              <Switch checked={d.vnwsRegistration} onChange={(v) => set({ vnwsRegistration: v })} label={`${t.registration} · ${a.short}`} />
              <Switch checked={d.ragRegistration} onChange={(v) => set({ ragRegistration: v })} label={`${t.registration} · ${b.short}`} />
            </Grid>
          </>
        )}
      </Card>
      {!focus && <MapCard view={d.map} onChange={(map) => set({ map })} />}
    </>
  )
}

// ── VATSIM ────────────────────────────────────────────────────────────────
const KINDS: { value: VatsimEventKind; icon: typeof Plane; key: 'Shuttle' | 'Online' | 'Overload' | 'Cross' }[] = [
  { value: 'shuttle', icon: RefreshCw, key: 'Shuttle' },
  { value: 'online-day', icon: Radar, key: 'Online' },
  { value: 'overload', icon: Plane, key: 'Overload' },
  { value: 'cross-region', icon: Globe2, key: 'Cross' },
]

export function VatsimForm() {
  const t = useT()
  const [d, set] = useMode('vatsim-region')
  const vatsim = useVatsimDb()
  const setKind = (kind: VatsimEventKind) => set({ kind, map: { ...d.map, zoom: 1, dx: 0, dy: 0 } })
  return (
    <>
      <Card title={t.eventKind} icon={Globe2}>
        <div className="kind-grid">
          {KINDS.map((k) => (
            <button type="button" key={k.value} className={`kind ${d.kind === k.value ? 'is-active' : ''}`} onClick={() => setKind(k.value)}>
              <k.icon size={20} strokeWidth={1.8} />
              <b>{t[`kind${k.key}`]}</b>
              <span>{t[`kind${k.key}Hint`]}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={t.basics} icon={Type}>
        <TitleFields title={d.title} description={d.description} onChange={set} t={t} />
        <Grid cols={3}>
          <Field label={t.date}><TextInput value={d.date} placeholder={t.datePh} onValue={(v) => set({ date: v.toUpperCase() })} /></Field>
          <Field label={t.timeStart}><TextInput mono value={d.timeStart} placeholder="16:00" onValue={(v) => set({ timeStart: v })} /></Field>
          <Field label={t.timeEnd}><TextInput mono value={d.timeEnd} placeholder="20:00" onValue={(v) => set({ timeEnd: v })} /></Field>
        </Grid>
      </Card>

      {d.kind === 'shuttle' && (
        <Card title={t.focusAirports} icon={RefreshCw}>
          <Grid>
            <Field label={t.shuttleA}><AirportPicker value={d.airports[0] ?? ''} onPick={(a) => set({ airports: [a.icao, d.airports[1] ?? ''] })} placeholder="UUEE" /></Field>
            <Field label={t.shuttleB}><AirportPicker value={d.airports[1] ?? ''} onPick={(a) => set({ airports: [d.airports[0] ?? '', a.icao] })} placeholder="ULLI" /></Field>
          </Grid>
          <Field label={t.firs}><FirPicker value={d.firs} onChange={(firs) => set({ firs })} /></Field>
        </Card>
      )}
      {d.kind === 'online-day' && (
        <Card title={t.regions} icon={Radar}>
          <Field label={t.divisions}><DivisionPicker value={d.divisions} onChange={(divisions) => set({ divisions })} /></Field>
          <Field label={t.firs}><FirPicker value={d.firs} divisions={d.divisions} onChange={(firs) => set({ firs })} /></Field>
          <Field label={t.focusAirports}><AirportList value={d.airports} onChange={(airports) => set({ airports })} placeholder={t.airportSearch} /></Field>
        </Card>
      )}
      {d.kind === 'overload' && (
        <Card title={t.focusAirports} icon={Building2}>
          <Field label={t.focusAirports}><AirportList value={d.airports} max={3} onChange={(airports) => set({ airports })} placeholder={t.airportSearch} /></Field>
          <Field label={t.feeders} hint={d.feeders.length ? undefined : t.autoFeeders}><AirportList value={d.feeders} max={14} onChange={(feeders) => set({ feeders })} placeholder={t.airportSearch} /></Field>
          <Field label={t.firs}><FirPicker value={d.firs} onChange={(firs) => set({ firs })} /></Field>
        </Card>
      )}
      {d.kind === 'cross-region' && (
        <>
          <Card title={t.regions} icon={Radar}>
            <Field label={t.divisions}><DivisionPicker value={d.divisions} onChange={(divisions) => set({ divisions })} /></Field>
            <Field label={t.firs}><FirPicker value={d.firs} divisions={d.divisions} onChange={(firs) => set({ firs })} /></Field>
          </Card>
          <Card title={t.projects} icon={Building2}><ProjectPair value={d.projects ?? ['nws', 'rag']} onChange={(projects) => set({ projects })} /></Card>
          <RouteBoard tracks={[
            { key: 'a', label: `${t.legs} ${projectById(d.projects?.[0] ?? 'nws').short}`, accent: projectById(d.projects?.[0] ?? 'nws').colors.route, legs: d.vnwsLegs, onChange: (vnwsLegs) => set({ vnwsLegs }) },
            { key: 'b', label: `${t.legs} ${projectById(d.projects?.[1] ?? 'rag').short}`, accent: projectById(d.projects?.[1] ?? 'rag').colors.route, legs: d.ragLegs, onChange: (ragLegs) => set({ ragLegs }) },
          ]} />
        </>
      )}

      <Card title={t.positions} icon={Radar} hint={vatsim ? `${vatsim.firs.length} FIR / sectors · VATSpy` : undefined}>
        <Field label={t.positions}><TextInput mono value={d.positions} placeholder="UUEE_TWR, UUWV_CTR" onValue={(v) => set({ positions: v.toUpperCase() })} /></Field>
        <Field label={t.hosts}><TextInput value={d.hosts} placeholder={t.hostsPh} onValue={(v) => set({ hosts: v })} /></Field>
        <Field label={t.logoLibrary}><LogoPicker value={d.logos} onChange={(logos) => set({ logos })} /></Field>
      </Card>
      <MapCard view={d.map} onChange={(map) => set({ map })} />
      <RewardCard value={d} onChange={set} t={t} />
    </>
  )
}
