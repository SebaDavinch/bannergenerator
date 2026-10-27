import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GallerySlot } from '../editor/gallerySlot'
import { ImagePlus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import type { PhotoCandidate } from '../photos/commons'
import { fileToDataUrl } from '../photos/image'
import { useStore } from '../state/store'
import type { PhotoState } from '../types'
import { UI } from '../i18n'
import { Button, Slider } from './controls'

type Candidate = PhotoCandidate & { landmark?: string }

/**
 * Suggestion grid + upload + framing for a banner photo. Re-searches when
 * `searchKey` changes and auto-picks the best hit unless the user chose one.
 */
export function PhotoPicker({ photo, onChange, search, searchKey, framing = true, dimDefault = 0, title, hint, note = true }: {
  photo: PhotoState
  onChange: (p: Partial<PhotoState>) => void
  search: (signal: AbortSignal) => Promise<Candidate[]>
  searchKey: string
  framing?: boolean
  dimDefault?: number
  /** Panel heading and source note (e.g. "Landmarks", "Wikidata · Commons"). */
  title?: string
  hint?: string
  /** Leave a pointer in the form when the panel is shown on the right. */
  note?: boolean
}) {
  const { state } = useStore()
  const t = UI[state.locale]
  const slot = useContext(GallerySlot)
  const [results, setResults] = useState<Candidate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastKey = useRef<string | null>(null)
  const latest = useRef({ photo, onChange, search })
  useLayoutEffect(() => { latest.current = { photo, onChange, search } })

  const run = (auto: boolean) => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(false)
    latest.current.search(ctrl.signal)
      .then((list) => {
        setResults(list)
        const p = latest.current.photo
        // Only replace the photo when nothing was chosen by hand.
        if (auto && list[0] && (!p.src || p.auto) && !p.local?.startsWith('data:')) {
          latest.current.onChange({ src: list[0].url, local: undefined, credit: list[0].credit, title: list[0].landmark || list[0].title, auto: true, x: 50, y: 50, zoom: 1 })
        }
      })
      .catch((e) => { if (e?.name !== 'AbortError') { setError(true); setResults([]) } })
      .finally(() => setLoading(false))
    return ctrl
  }

  useEffect(() => {
    if (!searchKey || lastKey.current === searchKey) return
    lastKey.current = searchKey
    const ctrl = run(true)
    return () => ctrl.abort()
  }, [searchKey])

  // Paste a copied image (e.g. from JetPhotos) anywhere on the page while this picker is shown.
  const onFileRef = useRef<(f?: File) => void>(() => undefined)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) { e.preventDefault(); onFileRef.current(file) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const onFile = async (file?: File) => {
    if (!file) return
    const local = await fileToDataUrl(file)
    onChange({ local, src: '', credit: '', title: file.name, auto: false, x: 50, y: 50, zoom: 1, dim: photo.dim || dimDefault })
  }

  useEffect(() => { onFileRef.current = (f) => { void onFile(f) } })
  const selected = photo.local || photo.src
  // One panel: actions, suggestions and framing. It lives under the preview
  // (right column) when that slot exists, otherwise inline in the form.
  const panel = (
    <section className="gallery photo-picker"
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((i) => i.type.startsWith('image/'))) e.preventDefault() }}
      onDrop={(e) => { const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); void onFile(f) } }}>
      <header className="gallery__head">
        <span className="gallery__title">{title ?? t.photoGallery}</span>
        {results && results.length > 0 && <span className="gallery__count">{results.length}</span>}
        {hint && <span className="gallery__source">{hint}</span>}
        <div className="gallery__actions">
          <Button size="sm" variant="primary" icon={loading ? RefreshCw : Sparkles} disabled={loading} onClick={() => run(false)} className={loading ? 'is-spinning' : ''}>
            {loading ? t.searching : t.findPhotos}
          </Button>
          <Button size="sm" icon={ImagePlus} onClick={() => fileRef.current?.click()}>{t.upload}</Button>
          {selected && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange({ src: '', local: undefined, credit: '', title: '', auto: false })}>{t.clear}</Button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </header>
      {results && results.length > 0 && (
        <div className="photo-grid photo-grid--wide">
          {results.map((c) => (
            <button type="button" key={c.url} className={`photo-grid__item ${photo.src === c.url ? 'is-active' : ''}`} title={`${c.title}\n${c.credit}`}
              onClick={() => onChange({ src: c.url, local: undefined, credit: c.credit, title: c.landmark || c.title, auto: false, x: 50, y: 50, zoom: 1 })}>
              <img src={c.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span className="photo-grid__label">
                {c.landmark && <b>{c.landmark}</b>}
                <i>{c.provider}{c.width ? ` · ${c.width}×${c.height}` : ''}</i>
              </span>
            </button>
          ))}
        </div>
      )}
      {results && results.length === 0 && !loading && <p className={error ? 'warn small' : 'muted small'}>{error ? t.photoBlocked : t.noPhotos}</p>}
      <p className="gallery__hint">{t.pasteHint}</p>
      {(photo.credit || photo.title) && selected && <p className="photo-picker__credit">{photo.title}{photo.credit && ` — ${photo.credit}`}</p>}

      {framing && selected && (
        <div className="photo-picker__framing">
          <Slider label={t.zoom} value={photo.zoom} min={1} max={2.5} step={0.01} onChange={(v) => onChange({ zoom: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label={t.posX} value={photo.x} min={0} max={100} onChange={(v) => onChange({ x: v })} format={(v) => `${Math.round(v)}%`} />
          <Slider label={t.posY} value={photo.y} min={0} max={100} onChange={(v) => onChange({ y: v })} format={(v) => `${Math.round(v)}%`} />
          <Slider label={t.dim} value={photo.dim} min={0} max={0.9} step={0.01} onChange={(v) => onChange({ dim: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label={t.blur} value={photo.blur} min={0} max={20} step={0.5} onChange={(v) => onChange({ blur: v })} format={(v) => `${v}px`} />
          <p className="muted small">{t.dragHint}</p>
        </div>
      )}
    </section>
  )
  return slot ? <>{createPortal(panel, slot)}{note && <p className="muted small photo-picker__moved">{t.photoPanelRight}</p>}</> : panel
}
