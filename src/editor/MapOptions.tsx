import { Maximize2 } from 'lucide-react'
import { projectById } from '../data/projects'
import { defaultMap } from '../state/defaults'
import { useStore } from '../state/store'
import type { MapView } from '../types'
import { UI } from '../i18n'
import { THEME_IDS, paletteFor } from '../map/themes'
import { Button, Field, Segmented, Slider, Switch } from '../ui/controls'

/** Theme swatches drawn from each palette's own relief ramp. */
function ThemeSwatches({ value, onChange }: { value: MapView['theme']; onChange: (v: MapView['theme']) => void }) {
  const { state } = useStore()
  const project = projectById(state.brand)
  return (
    <div className="theme-swatches">
      {THEME_IDS.map((id) => {
        const p = paletteFor(id, project.colors)
        const land = p.relief.land.map(([, c], i, a) => `${c} ${Math.round((i / (a.length - 1)) * 100)}%`).join(', ')
        return (
          <button type="button" key={id} className={`theme-swatch ${value === id ? 'is-active' : ''}`} onClick={() => onChange(id)} title={p.name[state.locale]}>
            <span className="theme-swatch__img" style={{ background: `linear-gradient(110deg, ${p.relief.sea[2]?.[1] ?? p.seaOuter} 0 34%, ${p.relief.sea[0][1]} 34% 42%, transparent 42%), linear-gradient(90deg, ${land})` }}>
              {id === 'brand' && <i style={{ background: project.colors.primary }} />}
            </span>
            <span className="theme-swatch__name">{p.name[state.locale]}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MapOptions({ view, set, compact }: { view: MapView; set: (p: Partial<MapView>) => void; compact?: boolean }) {
  const { state } = useStore()
  const t = UI[state.locale]
  return (
    <div className={`map-options ${compact ? 'map-options--compact' : ''}`}>
      <Field label={t.mapTheme}><ThemeSwatches value={view.theme} onChange={(theme) => set({ theme })} /></Field>
      <div className="map-options__row">
        <Switch checked={view.relief} onChange={(v) => set({ relief: v })} label={t.relief} />
        {view.relief && <Slider label={t.reliefStrength} value={view.reliefStrength} min={0.3} max={3} step={0.05} onChange={(v) => set({ reliefStrength: v })} format={(v) => `×${v.toFixed(2)}`} />}
      </div>
      <Field label={t.projection}>
        <Segmented size="sm" value={view.projection} onChange={(v) => set({ projection: v, zoom: 1, dx: 0, dy: 0 })}
          options={[{ value: 'mercator', label: t.projMercator }, { value: 'conic', label: t.projConic }, { value: 'natural', label: t.projWorld }, { value: 'globe', label: t.projGlobe }]} />
      </Field>
      <Field label={t.fit}>
        <Segmented size="sm" value={view.frame} onChange={(v) => set({ frame: v, zoom: 1, dx: 0, dy: 0 })}
          options={[{ value: 'content', label: t.fitContent }, { value: 'full', label: <><Maximize2 size={12} /> {t.fitFull}</> }]} />
      </Field>
      <Field label={t.labelMode}>
        <Segmented size="sm" value={view.labelMode} onChange={(v) => set({ labelMode: v })}
          options={[{ value: 'icao', label: 'ICAO' }, { value: 'icao-city', label: `ICAO + ${t.city}` }, { value: 'city', label: t.city }]} />
      </Field>
      <Field label={t.routeStyle}>
        <Segmented size="sm" value={view.routeStyle} onChange={(v) => set({ routeStyle: v })}
          options={[{ value: 'solid', label: t.styleSolid }, { value: 'dashed', label: t.styleDashed }, { value: 'dotted', label: t.styleDotted }]} />
      </Field>
      <Slider label={t.routeWidth} value={view.routeWidth} min={2} max={9} step={0.5} onChange={(v) => set({ routeWidth: v })} format={(v) => `${v}px`} />
      <div className="map-options__toggles">
        <Switch checked={view.numbers} onChange={(v) => set({ numbers: v })} label={t.numbers} />
        <Switch checked={view.rivers} onChange={(v) => set({ rivers: v })} label={t.rivers} />
        <Switch checked={view.cities} onChange={(v) => set({ cities: v })} label={t.cities} />
        <Switch checked={view.borders} onChange={(v) => set({ borders: v })} label={t.borders} />
        <Switch checked={view.graticule} onChange={(v) => set({ graticule: v })} label={t.graticule} />
        <Switch checked={view.labels} onChange={(v) => set({ labels: v })} label={t.labels} />
      </div>
      <Slider label={t.guard} value={view.guard} min={0} max={1} step={0.01} onChange={(v) => set({ guard: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Button size="sm" onClick={() => set({ ...defaultMap(), theme: view.theme })}>{t.reset}</Button>
    </div>
  )
}
