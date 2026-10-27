import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
export function PhotoPicker({ photo, onChange, search, searchKey, framing = true, dimDefault = 0 }: {
  photo: PhotoState
  onChange: (p: Partial<PhotoState>) => void
  search: (signal: AbortSignal) => Promise<Candidate[]>
  searchKey: string
  framing?: boolean
  dimDefault?: number
}) {
  const { state } = useStore()
  const t = UI[state.locale]
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

  const onFile = async (file?: File) => {
    if (!file) return
    const local = await fileToDataUrl(file)
    onChange({ local, src: '', credit: '', title: file.name, auto: false, x: 50, y: 50, zoom: 1, dim: photo.dim || dimDefault })
  }

  const selected = photo.local || photo.src
  return (
    <div className="photo-picker">
      <div className="photo-picker__bar">
        <Button size="sm" variant="primary" icon={loading ? RefreshCw : Sparkles} disabled={loading} onClick={() => run(false)} className={loading ? 'is-spinning' : ''}>
          {loading ? t.searching : t.findPhotos}
        </Button>
        <Button size="sm" icon={ImagePlus} onClick={() => fileRef.current?.click()}>{t.upload}</Button>
        {selected && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange({ src: '', local: undefined, credit: '', title: '', auto: false })}>{t.clear}</Button>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {results && results.length > 0 && (
        <div className="photo-grid">
          {results.map((c) => (
            <button type="button" key={c.url} className={`photo-grid__item ${photo.src === c.url ? 'is-active' : ''}`} title={`${c.title}\n${c.credit}`}
              onClick={() => onChange({ src: c.url, local: undefined, credit: c.credit, title: c.landmark || c.title, auto: false, x: 50, y: 50, zoom: 1 })}>
              <img src={c.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
              {(c.landmark || c.width) && (
                <span className="photo-grid__label">
                  {c.landmark && <b>{c.landmark}</b>}
                  <i>{c.width}×{c.height}</i>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {results && results.length === 0 && !loading && <p className="muted small">{t.noPhotos}{error ? ` (${t.offline})` : ''}</p>}
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
    </div>
  )
}
