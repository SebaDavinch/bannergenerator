import { useState } from 'react'
import { Crosshair, Lock, LockOpen, Maximize2, Minus, Plus, ScanLine, Settings2 } from 'lucide-react'
import { defaultMap } from '../state/defaults'
import { useStore } from '../state/store'
import type { MapView } from '../types'
import { activeMap } from './activeMap'
import { UI } from '../i18n'
import { Button, Segmented, Slider, Switch } from '../ui/controls'
import { boxCenter, fitBox, zoomAt } from '../map/projection'

/** Floating map controls over the preview (outside the exported stage). */
export function MapToolbar({ guides, onGuides }: { guides: boolean; onGuides: (v: boolean) => void }) {
  const { state, update } = useStore()
  const t = UI[state.locale]
  const [open, setOpen] = useState(false)
  const active = activeMap(state)
  if (!active) return null
  const { view } = active
  const set = (p: Partial<MapView>) => update(active.mode, { map: { ...view, ...p } } as never)
  // Zoom buttons keep the fit-box center fixed (the same math as wheel zoom).
  const zoomBy = (f: number) => {
    const box = fitBox(view.frame)
    set(zoomAt({ baseTranslate: boxCenter(box), box }, view, f, boxCenter(box)))
  }

  return (
    <div className="map-toolbar">
      <div className="map-toolbar__row">
        <Button size="sm" variant="ghost" icon={Crosshair} title={t.fit} onClick={() => set({ zoom: 1, dx: 0, dy: 0 })} />
        <Button size="sm" variant="ghost" icon={Minus} title="−" onClick={() => zoomBy(1 / 1.2)} disabled={view.locked} />
        <input className="map-toolbar__zoom" type="number" step={5} min={25} max={1200} value={Math.round(view.zoom * 100)} disabled={view.locked}
          onChange={(e) => {
            const z = Math.max(25, Math.min(1200, Number(e.target.value) || 100)) / 100
            zoomBy(z / view.zoom)
          }} />
        <span className="map-toolbar__unit">%</span>
        <Button size="sm" variant="ghost" icon={Plus} title="+" onClick={() => zoomBy(1.2)} disabled={view.locked} />
        <span className="map-toolbar__sep" />
        <Button size="sm" variant={view.locked ? 'primary' : 'ghost'} icon={view.locked ? Lock : LockOpen} title={view.locked ? t.unlock : t.lock} onClick={() => set({ locked: !view.locked })} />
        <Button size="sm" variant={guides ? 'primary' : 'ghost'} icon={ScanLine} title={t.safeArea} onClick={() => onGuides(!guides)} />
        <Button size="sm" variant={open ? 'primary' : 'ghost'} icon={Settings2} title={t.mapSettings} onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <div className="map-toolbar__panel">
          <div className="map-toolbar__label">{t.mapTheme}</div>
          <Segmented size="sm" value={view.theme} onChange={(v) => set({ theme: v })}
            options={[{ value: 'night', label: 'Night' }, { value: 'dusk', label: 'Dusk' }, { value: 'steel', label: 'Steel' }]} />
          <div className="map-toolbar__label">{t.projection}</div>
          <Segmented size="sm" value={view.projection} onChange={(v) => set({ projection: v, zoom: 1, dx: 0, dy: 0 })}
            options={[{ value: 'mercator', label: 'Mercator' }, { value: 'conic', label: 'Conic' }, { value: 'natural', label: 'World' }, { value: 'globe', label: 'Globe' }]} />
          <div className="map-toolbar__label">{t.fit}</div>
          <Segmented size="sm" value={view.frame} onChange={(v) => set({ frame: v, zoom: 1, dx: 0, dy: 0 })}
            options={[{ value: 'content', label: t.fitContent }, { value: 'full', label: <><Maximize2 size={12} /> {t.fitFull}</> }]} />
          <div className="map-toolbar__grid">
            <label><span>X</span><input type="number" step={1} value={Math.round(view.dx)} disabled={view.locked} onChange={(e) => set({ dx: Number(e.target.value) || 0 })} /></label>
            <label><span>Y</span><input type="number" step={1} value={Math.round(view.dy)} disabled={view.locked} onChange={(e) => set({ dy: Number(e.target.value) || 0 })} /></label>
          </div>
          <Switch checked={view.borders} onChange={(v) => set({ borders: v })} label={t.borders} />
          <Switch checked={view.graticule} onChange={(v) => set({ graticule: v })} label={t.graticule} />
          <Switch checked={view.labels} onChange={(v) => set({ labels: v })} label={t.labels} />
          <Slider label={t.guard} value={view.guard} min={0} max={1} step={0.01} onChange={(v) => set({ guard: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Button size="sm" onClick={() => set({ ...defaultMap(), theme: view.theme })}>{t.reset}</Button>
          <p className="muted small">{t.mapHint}</p>
        </div>
      )}
    </div>
  )
}
