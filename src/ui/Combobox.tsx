import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * Minimal accessible combobox: free typing, arrow/enter navigation, async-free
 * (callers pass already-filtered items).
 */
export function Combobox<T>({
  value, onInput, items, renderItem, onPick, onCommit, placeholder, mono, leading, footer, autoFocus,
}: {
  value: string
  onInput: (v: string) => void
  items: T[]
  renderItem: (item: T, active: boolean) => ReactNode
  onPick: (item: T) => void
  /** Free text accepted with Enter (no suggestion highlighted) or on blur. */
  onCommit?: (text: string) => void
  placeholder?: string
  mono?: boolean
  leading?: ReactNode
  footer?: ReactNode
  autoFocus?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const pick = (item: T) => { onPick(item); setOpen(false) }
  const show = open && (items.length > 0 || !!footer)
  const current = Math.min(active, Math.max(0, items.length - 1))

  return (
    <div className="combo" ref={wrap}>
      <div className="combo__control">
        {leading && <span className="combo__leading">{leading}</span>}
        <input
          className={`input ${mono ? 'input--mono' : ''} ${leading ? 'input--lead' : ''}`}
          role="combobox" aria-expanded={show} aria-controls={listId} autoComplete="off" spellCheck={false}
          value={value} placeholder={placeholder} autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onBlur={() => onCommit?.(value)}
          onChange={(e) => { onInput(e.target.value); setOpen(true); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
            else if (e.key === 'Enter' && show && items[current]) { e.preventDefault(); pick(items[current]) }
            else if (e.key === 'Enter' && onCommit) { e.preventDefault(); onCommit(value); setOpen(false) }
            else if (e.key === 'Escape') setOpen(false)
          }}
        />
      </div>
      {show && (
        <div className="combo__menu" id={listId} role="listbox">
          {items.map((item, i) => (
            <div key={i} role="option" aria-selected={i === current} className={`combo__item ${i === current ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(i)} onPointerDown={(e) => { e.preventDefault(); pick(item) }}>
              {renderItem(item, i === current)}
            </div>
          ))}
          {footer && <div className="combo__footer">{footer}</div>}
        </div>
      )}
    </div>
  )
}
