import { useEffect, useRef, useState } from 'react'
import {
  CalendarClock, Circle, Download, Globe2, Handshake, History, ListOrdered, MapPin, NotebookPen, Radar, RotateCcw, Route, Swords, type LucideIcon,
} from 'lucide-react'
import { loadAirports } from './data/airports'
import { loadVatsim } from './data/vatsim'
import { loadWorld } from './data/geo'
import { loadFleet } from './data/fleet'
import { Preview } from './editor/Preview'
import { ProjectSwitcher } from './editor/ProjectSwitcher'
import { ProjectsDialog } from './editor/ProjectsDialog'
import { projectById, useProjects } from './data/projects'
import { mix } from './map/themes'
import { ChallengeForm, CollabForm, FocusForm, GoalForm, RosterForm, SlottedForm, TourForm, VatsimForm } from './editor/forms'
import { ExportDialog } from './export/ExportDialog'
import { HistoryPanel } from './export/HistoryPanel'
import { MODES, UI } from './i18n'
import { useStore } from './state/store'
import type { ModeId } from './types'
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

export default function App() {
  const { state, set, resetMode } = useStore()
  const t = UI[state.locale]
  const stageRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [history, setHistory] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  useProjects()
  const project = projectById(state.brand)
  const appStyle = {
    '--p-accent': project.colors.primary,
    '--p-grad': `linear-gradient(135deg, ${mix(project.colors.primary, '#ffffff', 0.18)} 0%, ${project.colors.primary} 55%, ${mix(project.colors.primary, '#000000', 0.3)} 100%)`,
    '--p-glow': `0 0 0 1px ${project.colors.primary}59, 0 4px 24px ${project.colors.primary}59`,
    '--p-soft': `${project.colors.primary}29`,
    '--p-ring': `${project.colors.primary}73`,
  } as React.CSSProperties
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
    <div className="app" data-brand={state.brand} style={appStyle}>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark">{project.icao.slice(0, 1)}</span>
          <div>
            <div className="topbar__title">{t.appTitle}</div>
            <div className="topbar__sub">{t.appSubtitle}</div>
          </div>
        </div>
        <div className="topbar__spacer" />
        <div className="topbar__group">
          <span className="topbar__label">{t.brand}</span>
          <ProjectSwitcher onManage={() => setProjectsOpen(true)} />
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
      {history && <HistoryPanel onClose={() => setHistory(false)} />}
      {projectsOpen && <ProjectsDialog onClose={() => setProjectsOpen(false)} />}
    </div>
  )
}
