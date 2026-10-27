import { useEffect, useRef, useState } from 'react'
import {
  CalendarClock, Circle, Download, Globe2, Handshake, History, ListOrdered, MapPin, NotebookPen, Radar, RotateCcw, Route, Swords, X, type LucideIcon,
} from 'lucide-react'
import { loadAirports } from './data/airports'
import { loadVatsim } from './data/vatsim'
import { loadWorld } from './data/geo'
import { loadFleet } from './data/fleet'
import { Preview } from './editor/Preview'
import { ChallengeForm, CollabForm, FocusForm, GoalForm, RosterForm, SlottedForm, TourForm, VatsimForm } from './editor/forms'
import { ExportDialog } from './export/ExportDialog'
import { removeHistory, useHistory } from './export/history'
import { MODES, UI } from './i18n'
import { useStore } from './state/store'
import type { ModeDataMap, ModeId } from './types'
import { Button, Segmented } from './ui/controls'

const MODE_ICONS: Record<string, LucideIcon> = { MapPin, Route, ListOrdered, NotebookPen, Swords, Radar, CalendarClock, Handshake, Globe2 }

function ModeIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = MODE_ICONS[name] ?? Circle
  return <Icon size={size} strokeWidth={1.8} />
}

function ModeForm({ mode }: { mode: ModeId }) {
  switch (mode) {
    case 'focus-airport': return <FocusForm />
    case 'tour': return <TourForm />
    case 'roster': return <RosterForm key="r" mode="roster" />
    case 'curated-roster': return <RosterForm key="c" mode="curated-roster" />
    case 'community-challenge': return <ChallengeForm />
    case 'community-goal': return <GoalForm />
    case 'slotted': return <SlottedForm />
    case 'event': return <CollabForm />
    case 'vatsim-region': return <VatsimForm />
  }
}

function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const { state, set, update } = useStore()
  const t = UI[state.locale]
  const items = useHistory()
  return (
    <div className="drawer" role="dialog" aria-label={t.history}>
      <header className="drawer__head">
        <h2>{t.history}</h2>
        <Button variant="ghost" icon={X} onClick={onClose} aria-label={t.close} />
      </header>
      <div className="drawer__body">
        {items.length === 0 && <p className="muted">{t.historyEmpty}</p>}
        {items.map((h) => (
          <div className="history-item" key={h.id}>
            <img src={h.thumb} alt="" />
            <div className="history-item__meta">
              <b>{h.title}</b>
              <span>{MODES.find((m) => m.id === h.mode)?.label[state.locale]} · {h.brand.toUpperCase()} · {new Date(h.at).toLocaleString(state.locale === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <div className="history-item__actions">
                <Button size="sm" onClick={() => { update(h.mode, h.data as Partial<ModeDataMap[typeof h.mode]>); set({ mode: h.mode, brand: h.brand }); onClose() }}>{t.open}</Button>
                <Button size="sm" variant="ghost" icon={X} onClick={() => removeHistory(h.id)} aria-label="remove" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { state, set, resetMode } = useStore()
  const t = UI[state.locale]
  const stageRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [history, setHistory] = useState(false)
  const mode = MODES.find((m) => m.id === state.mode)!

  useEffect(() => {
    // Warm every database in the background; the UI renders before they land.
    loadAirports(); loadWorld(); loadVatsim(); loadFleet()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); setExporting(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app" data-brand={state.brand}>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark">N</span>
          <div>
            <div className="topbar__title">{t.appTitle}</div>
            <div className="topbar__sub">{t.appSubtitle}</div>
          </div>
        </div>
        <div className="topbar__spacer" />
        <div className="topbar__group">
          <span className="topbar__label">{t.brand}</span>
          <Segmented size="sm" value={state.brand} onChange={(brand) => set({ brand })} options={[{ value: 'nws', label: 'vNWS' }, { value: 'rag', label: 'RAG' }]} />
        </div>
        <div className="topbar__group">
          <span className="topbar__label">{t.bannerLang}</span>
          <Segmented size="sm" value={state.bannerLang} onChange={(bannerLang) => set({ bannerLang })} options={[{ value: 'en', label: 'EN' }, { value: 'ru', label: 'RU' }]} />
        </div>
        <div className="topbar__group">
          <span className="topbar__label">{t.ui}</span>
          <Segmented size="sm" value={state.locale} onChange={(locale) => set({ locale })} options={[{ value: 'ru', label: 'RU' }, { value: 'en', label: 'EN' }]} />
        </div>
        <Button variant="ghost" icon={History} onClick={() => setHistory(true)}>{t.history}</Button>
        <Button variant="primary" icon={Download} onClick={() => setExporting(true)}>{t.export}</Button>
      </header>

      <div className="layout">
        <nav className="rail" aria-label={t.modes}>
          <div className="rail__label">{t.modes}</div>
          {MODES.map((m) => (
            <button type="button" key={m.id} className={`rail__item ${m.id === state.mode ? 'is-active' : ''}`} onClick={() => set({ mode: m.id })}>
              <span className="rail__icon"><ModeIcon name={m.icon} /></span>
              <span className="rail__text">
                <b>{m.label[state.locale]}</b>
                <span>{m.hint[state.locale]}</span>
              </span>
            </button>
          ))}
        </nav>

        <main className="workspace">
          <section className="workspace__preview">
            <Preview stageRef={stageRef} />
          </section>
          <section className="workspace__editor">
            <div className="editor-head">
              <span className="editor-head__icon"><ModeIcon name={mode.icon} size={20} /></span>
              <div>
                <h2>{mode.label[state.locale]}</h2>
                <p>{mode.hint[state.locale]}</p>
              </div>
              <div className="topbar__spacer" />
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => resetMode(state.mode)}>{t.resetMode}</Button>
            </div>
            <div className="editor-cards">
              <ModeForm mode={state.mode} />
            </div>
          </section>
        </main>
      </div>
      <footer className="footer">{t.footer} · <a href="https://twitch.tv/sebadavinch" target="_blank" rel="noreferrer">Grigorii — NWS0001</a></footer>
      {exporting && <ExportDialog stageRef={stageRef} onClose={() => setExporting(false)} />}
      {history && <HistoryDrawer onClose={() => setHistory(false)} />}
    </div>
  )
}
