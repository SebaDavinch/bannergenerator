import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, ImagePlus, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { BUILT_IN_PROJECTS, newProject, useProjects, type Project } from '../data/projects'
import { fileToDataUrl } from '../photos/image'
import { useStore } from '../state/store'
import type { MapTheme } from '../types'
import { UI } from '../i18n'
import { THEME_IDS, paletteFor } from '../map/themes'
import { brandTheme } from '../banner/brand'
import { Button, Field, Grid, Select, Slider, Switch, TextInput } from '../ui/controls'

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="color-field">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <TextInput mono value={value} onValue={(v) => /^#[0-9a-f]{6}$/i.test(v) && onChange(v)} />
      </div>
    </Field>
  )
}

/** Mini banner sample: accent bar, badge, route line and logo in the project's colours. */
function ProjectSample({ p }: { p: Project }) {
  const b = brandTheme(p)
  const pal = paletteFor(p.mapTheme, p.colors)
  return (
    <div className="project-sample" style={{ background: `radial-gradient(120% 120% at 70% 40%, ${pal.relief.land[1][1]} 0%, ${pal.relief.sea[2]?.[1] ?? pal.seaOuter} 100%)` }}>
      <span className="project-sample__bar" style={{ background: b.gradient }} />
      <span className="project-sample__badge" style={{ background: b.gradient }}>{p.short}</span>
      <svg viewBox="0 0 200 90" className="project-sample__route"><path d="M20 70 Q 90 0 180 40" fill="none" stroke={p.colors.route} strokeWidth="3.5" strokeLinecap="round" /><circle cx="20" cy="70" r="5" fill="#fff" /><circle cx="180" cy="40" r="5" fill="#fff" /></svg>
      <span className="project-sample__logo">
        {p.logo ? <img src={p.logo} alt="" /> : <b style={{ background: p.colors.primary }}>{p.icao.slice(0, 3)}</b>}
      </span>
    </div>
  )
}

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const { state, set } = useStore()
  const t = UI[state.locale]
  const { projects, save, remove } = useProjects()
  const [selId, setSelId] = useState(state.brand)
  const sel = projects.find((p) => p.id === selId) ?? projects[0]
  const [draft, setDraft] = useState<Project>(sel)
  const logoRef = useRef<HTMLInputElement>(null)

  const select = (p: Project) => { setSelId(p.id); setDraft(p) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const patch = (p: Partial<Project>) => setDraft((d) => ({ ...d, ...p }))
  const colors = (p: Partial<Project['colors']>) => setDraft((d) => ({ ...d, colors: { ...d.colors, ...p } }))
  const builtIn = BUILT_IN_PROJECTS.some((b) => b.id === draft.id)
  const fleetOptions = [{ value: '', label: t.projectFleetNone }, { value: 'vnws', label: 'vnws (vAMSYS)' }, { value: 'rag', label: 'rag (vAMSYS)' }]
  if (draft.fleet && !fleetOptions.some((o) => o.value === draft.fleet)) fleetOptions.push({ value: draft.fleet, label: draft.fleet })

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t.manageProjects} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal__panel modal__panel--wide">
        <header className="modal__head">
          <div>
            <h2>{t.manageProjects}</h2>
            <p className="muted small">{projects.length} · vAMSYS</p>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} aria-label={t.close} />
        </header>
        <div className="projects">
          <aside className="projects__list">
            {projects.map((p) => (
              <button type="button" key={p.id} className={`project-item ${p.id === selId ? 'is-active' : ''} ${p.hidden ? 'is-hidden' : ''}`} onClick={() => select(p)}>
                <span className="project-item__dot" style={{ background: `linear-gradient(135deg, ${p.colors.primary} 50%, ${p.colors.secondary} 50%)` }} />
                <span className="project-item__text"><b>{p.short}</b><span>{p.name}</span></span>
                {p.builtIn && <span className="project-item__tag">{t.builtIn}</span>}
              </button>
            ))}
            <Button size="sm" icon={Plus} onClick={() => { const p = newProject(); void save(p); select(p) }}>{t.addProject}</Button>
          </aside>
          <section className="projects__form">
            <ProjectSample p={draft} />
            <Grid>
              <Field label={t.projectName}><TextInput value={draft.name} onValue={(v) => patch({ name: v })} /></Field>
              <Field label={t.projectShort}><TextInput value={draft.short} onValue={(v) => patch({ short: v })} /></Field>
            </Grid>
            <Grid cols={3}>
              <Field label={t.projectIcao}><TextInput mono value={draft.icao} maxLength={4} onValue={(v) => patch({ icao: v.toUpperCase() })} /></Field>
              <Field label={t.projectCallsign}><TextInput mono value={draft.callsign} maxLength={4} onValue={(v) => patch({ callsign: v.toUpperCase() })} /></Field>
              <Field label={t.projectVamsys} hint={t.projectVamsysHint}><TextInput mono value={draft.vamsys} onValue={(v) => patch({ vamsys: v.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
            </Grid>
            <Grid>
              <Field label={t.projectAirlines} hint={t.projectAirlinesHint}><TextInput value={draft.airlines.join(', ')} onValue={(v) => patch({ airlines: v.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
              <Field label={t.projectFleet}><Select value={draft.fleet} onChange={(v) => patch({ fleet: v })} options={fleetOptions} /></Field>
            </Grid>
            <div className="field__label">{t.colors}</div>
            <Grid cols={4}>
              <ColorField label={t.colorPrimary} value={draft.colors.primary} onChange={(v) => colors({ primary: v })} />
              <ColorField label={t.colorSecondary} value={draft.colors.secondary} onChange={(v) => colors({ secondary: v })} />
              <ColorField label={t.colorRoute} value={draft.colors.route} onChange={(v) => colors({ route: v })} />
              <ColorField label={t.colorDark} value={draft.colors.dark} onChange={(v) => colors({ dark: v })} />
            </Grid>
            <Grid>
              <Field label={t.logo} hint={draft.logo ? undefined : t.noLogo}>
                <div className="logo-field">
                  {draft.logo && <img src={draft.logo} alt="" />}
                  <Button size="sm" icon={ImagePlus} onClick={() => logoRef.current?.click()}>{t.upload}</Button>
                  {draft.logo && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => patch({ logo: '' })}>{t.clear}</Button>}
                  <input ref={logoRef} type="file" accept="image/png,image/svg+xml,image/webp" hidden onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const src = f.type === 'image/svg+xml'
                      ? await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(f) })
                      : await fileToDataUrl(f, 1200)
                    patch({ logo: src })
                    e.target.value = ''
                  }} />
                </div>
              </Field>
              <Slider label={t.logoHeight} value={draft.logoHeight} min={36} max={110} onChange={(v) => patch({ logoHeight: v })} format={(v) => `${v}px`} />
            </Grid>
            <Field label={t.defaultMapTheme}>
              <Select value={draft.mapTheme} onChange={(v: MapTheme) => patch({ mapTheme: v })} options={THEME_IDS.map((id) => ({ value: id, label: paletteFor(id, draft.colors).name[state.locale] }))} />
            </Field>
            <Switch checked={!!draft.hidden} onChange={(v) => patch({ hidden: v })} label={t.hideProject} />
            <p className="muted small">{t.projectApplyNote}</p>
            <footer className="projects__actions">
              {builtIn
                ? <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { void remove(draft.id); setDraft(BUILT_IN_PROJECTS.find((b) => b.id === draft.id)!) }}>{t.resetProject}</Button>
                : <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { void remove(draft.id); select(BUILT_IN_PROJECTS[0]); if (state.brand === draft.id) set({ brand: 'nws' }) }}>{t.deleteProject}</Button>}
              <span className="topbar__spacer" />
              <Button size="sm" variant="ghost" icon={draft.id === state.brand ? Eye : EyeOff} onClick={() => set({ brand: draft.id })} disabled={draft.id === state.brand}>
                {draft.id === state.brand ? t.active : t.makeActive}
              </Button>
              <Button variant="primary" onClick={() => { void save(draft) }}>{t.save}</Button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  )
}
