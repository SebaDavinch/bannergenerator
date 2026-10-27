import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Clipboard, Download, Loader2, TriangleAlert, X } from 'lucide-react'
import { useStore } from '../state/store'
import type { ModeId } from '../types'
import { MODES, UI } from '../i18n'
import { Button, Field, Segmented, Slider, TextInput } from '../ui/controls'
import { pushHistory } from './history'
import { bannerTitle, defaultName, renderBanner } from './render'

type Format = 'png' | 'jpeg' | 'webp'
const SIZES = [
  { id: '720', w: 1280, h: 720, label: '1280 × 720', note: 'HD' },
  { id: '1080', w: 1920, h: 1080, label: '1920 × 1080', note: 'Full HD' },
  { id: '1440', w: 2560, h: 1440, label: '2560 × 1440', note: 'QHD' },
  { id: '2160', w: 3840, h: 2160, label: '3840 × 2160', note: '4K' },
]

export function ExportDialog({ stageRef, onClose }: { stageRef: RefObject<HTMLDivElement | null>; onClose: () => void }) {
  const { state } = useStore()
  const t = UI[state.locale]
  const [format, setFormat] = useState<Format>('png')
  const [size, setSize] = useState('1080')
  const [quality, setQuality] = useState(0.92)
  const [name, setName] = useState(() => defaultName(state))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const dims = SIZES.find((s) => s.id === size)!

  const [remoteImages, setRemoteImages] = useState(false)
  useEffect(() => {
    const node = stageRef.current
    setRemoteImages(!!node && [...node.querySelectorAll('img')].some((i) => /^https?:/.test(i.getAttribute('src') || '')))
  }, [stageRef])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url) }, [result])

  const render = async () => {
    const node = stageRef.current
    if (!node) return null
    setBusy(true)
    setError('')
    try {
      const canvas = await renderBanner(node, dims.w)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), `image/${format}`, format === 'png' ? undefined : quality))
      const url = URL.createObjectURL(blob)
      setResult({ blob, url })
      // Small JPEG thumbnail + full editor snapshot for the history drawer.
      const thumb = document.createElement('canvas')
      thumb.width = 480
      thumb.height = 270
      thumb.getContext('2d')!.drawImage(canvas, 0, 0, 480, 270)
      pushHistory({ mode: state.mode as ModeId, brand: state.brand, title: bannerTitle(state), thumb: thumb.toDataURL('image/jpeg', 0.75), data: state.data[state.mode] })
      return { blob, url }
    } catch (e) {
      setError(String((e as Error)?.message || e))
      return null
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    const r = result ?? (await render())
    if (!r) return
    const a = document.createElement('a')
    a.href = r.url
    a.download = `${name || 'banner'}.${format === 'jpeg' ? 'jpg' : format}`
    a.click()
  }

  const copy = async () => {
    const node = stageRef.current
    if (!node) return
    setBusy(true)
    try {
      // Clipboard only accepts PNG reliably.
      const canvas = await renderBanner(node, dims.w)
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (e) {
      setError(String((e as Error)?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const mode = MODES.find((m) => m.id === state.mode)
  const sizeLabel = result ? `${(result.blob.size / 1024 / 1024).toFixed(2)} MB` : ''

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t.exportTitle} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal__panel" ref={dialog}>
        <header className="modal__head">
          <div>
            <h2>{t.exportTitle}</h2>
            <p className="muted small">{mode?.label[state.locale]} · {state.brand === 'nws' ? 'vNWS' : 'RAG'}</p>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} aria-label={t.close} />
        </header>
        <div className="modal__body">
          <div className="export-preview">
            {result ? <img src={result.url} alt="" /> : <div className="export-preview__empty">{busy ? <Loader2 className="spin" /> : `${dims.label}`}</div>}
            {sizeLabel && <span className="export-preview__meta">{dims.label} · {format.toUpperCase()} · {sizeLabel}</span>}
          </div>
          <div className="export-form">
            <Field label={t.format}>
              <Segmented value={format} onChange={(v) => { setFormat(v); setResult(null) }}
                options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }, { value: 'webp', label: 'WebP' }]} />
            </Field>
            <Field label={t.size}>
              <div className="size-grid">
                {SIZES.map((s) => (
                  <button type="button" key={s.id} className={`size-opt ${s.id === size ? 'is-active' : ''}`} onClick={() => { setSize(s.id); setResult(null) }}>
                    <b>{s.note}</b><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            {format !== 'png' && <Slider label={t.quality} value={quality} min={0.6} max={1} step={0.01} onChange={(v) => { setQuality(v); setResult(null) }} format={(v) => `${Math.round(v * 100)}%`} />}
            <Field label={t.fileName}>
              <div className="filename"><TextInput mono value={name} onValue={setName} /><span>.{format === 'jpeg' ? 'jpg' : format}</span></div>
            </Field>
            {remoteImages && <p className="warn small"><TriangleAlert size={14} /> {t.exportWarnRemote}</p>}
            {error && <p className="warn small"><TriangleAlert size={14} /> {error}</p>}
          </div>
        </div>
        <footer className="modal__foot">
          <Button variant="ghost" onClick={() => render()} disabled={busy}>{busy ? t.rendering : t.preview}</Button>
          <Button icon={copied ? Check : Clipboard} onClick={copy} disabled={busy}>{copied ? t.copied : t.copy}</Button>
          <Button variant="primary" size="lg" icon={busy ? Loader2 : Download} onClick={download} disabled={busy} className={busy ? 'is-spinning' : ''}>{t.download}</Button>
        </footer>
      </div>
    </div>
  )
}
