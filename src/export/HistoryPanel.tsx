import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileDown, FileUp, Pencil, Search, Star, Trash2, X } from 'lucide-react'
import { projectById } from '../data/projects'
import { useStore } from '../state/store'
import type { ModeDataMap, ModeId } from '../types'
import { MODES, UI } from '../i18n'
import { Button, Select } from '../ui/controls'
import { clearHistory, exportHistoryJson, historyBlob, importHistoryJson, removeHistory, updateHistory, useHistory, type HistoryItem } from './history'

/** Local calendar day (YYYY-MM-DD). */
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('sv-SE')

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { state, set, update } = useStore()
  const t = UI[state.locale]
  const items = useHistory()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'all' | ModeId>('all')
  const [project, setProject] = useState('all')
  const [fav, setFav] = useState(false)
  const [sort, setSort] = useState<'new' | 'old'>('new')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [preview, setPreview] = useState<HistoryItem | null>(null)
  const [usage, setUsage] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const locale = state.locale === 'ru' ? 'ru-RU' : 'en-GB'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (preview) setPreview(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, preview])

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1024 / 1024).toFixed(1)} MB`)).catch(() => undefined)
  }, [items])

  const projectsUsed = useMemo(() => [...new Set(items.map((h) => h.brand))], [items])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = items.filter((h) =>
      (mode === 'all' || h.mode === mode) && (project === 'all' || h.brand === project) && (!fav || h.favorite) &&
      (!needle || h.title.toLowerCase().includes(needle) || (h.note ?? '').toLowerCase().includes(needle) || h.fileName.toLowerCase().includes(needle)))
    return sort === 'new' ? list : [...list].reverse()
  }, [items, q, mode, project, fav, sort])

  const [now] = useState(() => new Date())
  const groups = useMemo(() => {
    const today = dayKey(now)
    const yesterday = dayKey(new Date(now.getTime() - 864e5))
    const map = new Map<string, HistoryItem[]>()
    for (const h of filtered) {
      const d = dayKey(h.at)
      const label = d === today ? t.today : d === yesterday ? t.yesterday : new Date(h.at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(h)
    }
    return [...map.entries()]
  }, [filtered, t, locale, now])

  // Restores the editor state of that export; the history record itself stays untouched.
  const open = (h: HistoryItem) => {
    update(h.mode, h.data as Partial<ModeDataMap[typeof h.mode]>)
    set({ mode: h.mode, brand: h.brand, bannerLang: h.bannerLang ?? state.bannerLang })
    onClose()
  }

  const [full, setFull] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    if (!preview?.hasBlob) return
    let url = ''
    historyBlob(preview.id).then((b) => { if (b) { url = URL.createObjectURL(b); setFull({ id: preview.id, url }) } }).catch(() => undefined)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [preview])

  const download = async (h: HistoryItem) => {
    const blob = h.hasBlob ? await historyBlob(h.id) : undefined
    if (blob) saveBlob(blob, h.fileName)
    else {
      // Only the thumbnail survived (imported or legacy record).
      const res = await fetch(h.thumb)
      saveBlob(await res.blob(), h.fileName.replace(/\.\w+$/, '') + '-thumb.jpg')
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t.history} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal__panel modal__panel--wide history">
        <header className="modal__head">
          <div>
            <h2>{t.history}</h2>
            <p className="muted small">{items.length} {t.historyCount}{usage && ` · ${t.storage}: ${usage}`}</p>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} aria-label={t.close} />
        </header>
        <div className="history__toolbar">
          <label className="history__search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.historySearch} /></label>
          <Select value={mode} onChange={(v) => setMode(v)} options={[{ value: 'all', label: t.allModes }, ...MODES.map((m) => ({ value: m.id, label: m.label[state.locale] }))]} />
          <Select value={project} onChange={setProject} options={[{ value: 'all', label: t.allProjects }, ...projectsUsed.map((id) => ({ value: id, label: projectById(id).short }))]} />
          <Select value={sort} onChange={setSort} options={[{ value: 'new', label: t.sortNewest }, { value: 'old', label: t.sortOldest }]} />
          <Button size="sm" variant={fav ? 'primary' : 'secondary'} icon={Star} onClick={() => setFav(!fav)}>{t.favorites}</Button>
        </div>
        <div className="history__body">
          {filtered.length === 0 && <p className="muted history__empty">{t.historyEmpty}</p>}
          {groups.map(([label, list]) => (
            <section key={label} className="history__group">
              <h4>{label}</h4>
              <div className="history__grid">
                {list.map((h) => {
                  const p = projectById(h.brand)
                  const m = MODES.find((x) => x.id === h.mode)
                  return (
                    <article key={h.id} className="hcard">
                      <button type="button" className="hcard__thumb" onClick={() => setPreview(h)}>
                        <img src={h.thumb} alt="" loading="lazy" />
                        <span className="hcard__mode">{m?.label[state.locale]}</span>
                        {h.width > 0 && <span className="hcard__size">{h.width}×{h.height} · {h.format.toUpperCase()}</span>}
                      </button>
                      <div className="hcard__meta">
                        <span className="hcard__dot" style={{ background: p.colors.primary }} title={p.name} />
                        {renaming === h.id ? (
                          <input className="input hcard__rename" autoFocus defaultValue={h.title}
                            onBlur={(e) => { void updateHistory(h.id, { title: e.target.value || h.title }); setRenaming(null) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }} />
                        ) : <b title={h.title}>{h.title}</b>}
                        <button type="button" className={`hcard__star ${h.favorite ? 'is-on' : ''}`} onClick={() => void updateHistory(h.id, { favorite: !h.favorite })} aria-label={t.favorites}><Star size={15} /></button>
                      </div>
                      <div className="hcard__sub">{p.short} · {new Date(h.at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}{h.size > 0 && ` · ${(h.size / 1024 / 1024).toFixed(1)} MB`}</div>
                      <div className="hcard__actions">
                        <Button size="sm" onClick={() => open(h)}>{t.open}</Button>
                        <Button size="sm" variant="ghost" icon={Download} title={t.redownload} onClick={() => void download(h)} />
                        <Button size="sm" variant="ghost" icon={Pencil} title={t.rename} onClick={() => setRenaming(h.id)} />
                        <Button size="sm" variant="ghost" icon={Trash2} title={t.deleteItem} onClick={() => void removeHistory(h.id)} />
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
        <footer className="modal__foot history__foot">
          <Button size="sm" variant="ghost" icon={FileDown} onClick={async () => saveBlob(await exportHistoryJson(), `banner-history-${new Date().toISOString().slice(0, 10)}.json`)}>{t.exportJson}</Button>
          <Button size="sm" variant="ghost" icon={FileUp} onClick={() => importRef.current?.click()}>{t.importJson}</Button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importHistoryJson(f); e.target.value = '' }} />
          <span className="topbar__spacer" />
          <Button size="sm" variant="danger" icon={Trash2} disabled={!items.length} onClick={() => { if (window.confirm(t.confirmClear)) void clearHistory() }}>{t.clearHistory}</Button>
        </footer>
      </div>
      {preview && (
        <div className="lightbox" onPointerDown={(e) => { if (e.target === e.currentTarget) setPreview(null) }}>
          <img src={full?.id === preview.id ? full.url : preview.thumb} alt="" />
          <div className="lightbox__bar">
            <b>{preview.title}</b>
            <span className="topbar__spacer" />
            <Button size="sm" icon={Download} onClick={() => void download(preview)}>{t.redownload}</Button>
            <Button size="sm" variant="primary" onClick={() => open(preview)}>{t.open}</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setPreview(null)} aria-label={t.close} />
          </div>
        </div>
      )}
    </div>
  )
}
