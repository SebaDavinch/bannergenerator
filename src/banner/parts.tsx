import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { BANNER_COPY } from '../i18n'
import { usePhotoUrl } from '../photos/image'
import type { Brand, Locale, PhotoState } from '../types'
import { BRANDS, type BrandTheme } from './brand'
import { useStage } from './context'
import { titleSize } from './layout'

export function ModeBadge({ label, brand, extra }: { label: string; brand: BrandTheme; extra?: ReactNode }) {
  return (
    <div className="b-badge-row">
      <span className="b-badge" style={{ background: brand.gradient, boxShadow: `0 10px 40px ${brand.routeGlow}` }}>{label}</span>
      {extra}
      <span className="b-badge-rule" />
    </div>
  )
}

export function Title({ text, size, style }: { text: string; size?: number; style?: CSSProperties }) {
  return <h1 className="b-title" style={{ fontSize: size ?? titleSize(text), ...style }}>{text}</h1>
}

export function Ticks({ brand }: { brand: BrandTheme }) {
  return (
    <div className="b-ticks">
      <span style={{ background: brand.accent }} />
      <i /><i /><i /><i />
    </div>
  )
}

export function Period({ text, brand }: { text: string; brand: BrandTheme }) {
  if (!text) return null
  return (
    <div className="b-period">
      <span>{text}</span>
      <svg width="34" height="34" viewBox="0 0 34 34"><path d="M2 2 H32 V32" fill="none" stroke={brand.accent} strokeWidth="3" /></svg>
    </div>
  )
}

export function Reward({ points, registration, lang, brand, style, label }: { points: string; registration?: boolean; lang: Locale; brand: BrandTheme; style?: CSSProperties; label?: string }) {
  const c = BANNER_COPY[lang]
  if (!points.trim() && !registration) return null
  return (
    <div className="b-reward" style={style}>
      {points.trim() && (
        <>
          <div className="b-reward__eyebrow" style={{ color: brand.accentSoft }}>{label ?? c.reward}</div>
          <div className="b-reward__main">
            {c.earn} <span style={{ color: brand.accentSoft }}>{points}</span> {c.bonus}
          </div>
        </>
      )}
      {registration && (
        <div className="b-reward__reg"><ClipboardCheck size={26} strokeWidth={2} color={brand.accentSoft} /> {c.registration}</div>
      )}
    </div>
  )
}

export function BrandLogo({ brand, style }: { brand: Brand; style?: CSSProperties }) {
  const b = BRANDS[brand]
  return <img className="b-logo" src={b.logo} alt={b.name} style={{ height: b.logoHeight, ...style }} />
}

export function AccentBar({ brand }: { brand: BrandTheme }) {
  return <div className="b-accent-bar" style={{ background: brand.gradient }} />
}

/** Left-to-right dark guard so text stays readable over photos and maps. */
export function Guard({ strength = 0.85, from = 'left', light }: { strength?: number; from?: 'left' | 'bottom'; light?: boolean }) {
  const a = strength
  const c = light ? '8,14,24' : '6,9,15'
  const bg = from === 'left'
    ? `linear-gradient(90deg, rgba(${c},${a}) 0%, rgba(${c},${a * 0.9}) 28%, rgba(${c},${a * 0.45}) 46%, rgba(${c},0) 62%), linear-gradient(0deg, rgba(${c},${a * 0.85}) 0%, rgba(${c},0) 30%)`
    : `linear-gradient(0deg, rgba(${c},${a}) 0%, rgba(${c},0) 55%)`
  return <div className="b-guard" style={{ background: bg }} />
}

/**
 * Background photo with focus-point framing. In the editor it can be dragged
 * (pan) and wheel-zoomed; the banner stays WYSIWYG with the export.
 */
export function PhotoLayer({ photo, onChange, style, className = '' }: { photo: PhotoState; onChange?: (p: Partial<PhotoState>) => void; style?: CSSProperties; className?: string }) {
  const { url } = usePhotoUrl(photo)
  const { scale, interactive } = useStage()
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const editable = interactive && !!onChange
  const zoomRef = useRef({ zoom: photo.zoom, onChange })
  useEffect(() => { zoomRef.current = { zoom: photo.zoom, onChange } })
  useEffect(() => {
    const el = root.current
    if (!el || !editable) return
    // Native non-passive listener so wheel-zoom doesn't scroll the page.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { zoom, onChange: change } = zoomRef.current
      change?.({ zoom: Math.max(1, Math.min(2.5, zoom * Math.exp(-e.deltaY * 0.0015))) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [editable, url])
  if (!url) return <div className={`b-photo b-photo--empty ${className}`} style={style} />
  return (
    <div
      ref={root}
      className={`b-photo ${editable ? 'is-editable' : ''} ${className}`}
      style={style}
      onPointerDown={(e) => {
        if (!editable) return
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, px: photo.x, py: photo.y }
      }}
      onPointerMove={(e) => {
        if (!drag.current || !onChange) return
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const k = 100 / photo.zoom
        onChange({
          x: Math.max(0, Math.min(100, drag.current.px - ((e.clientX - drag.current.x) / r.width) * k * 1.6)),
          y: Math.max(0, Math.min(100, drag.current.py - ((e.clientY - drag.current.y) / r.height) * k * 1.6)),
          auto: false,
        })
      }}
      onPointerUp={() => { drag.current = null }}
      data-scale={scale}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          objectPosition: `${photo.x}% ${photo.y}%`,
          transform: `scale(${photo.zoom})`,
          transformOrigin: `${photo.x}% ${photo.y}%`,
          filter: photo.blur ? `blur(${photo.blur}px)` : undefined,
        }}
      />
      {photo.dim > 0 && <div className="b-photo__dim" style={{ opacity: photo.dim }} />}
    </div>
  )
}

export function BannerFooterNote({ children }: { children: ReactNode }) {
  return <div className="b-footnote">{children}</div>
}
