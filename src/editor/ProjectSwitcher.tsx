import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Settings2 } from 'lucide-react'
import { projectById, useProjects } from '../data/projects'
import { useStore } from '../state/store'
import { UI } from '../i18n'

/** Top-bar project picker with colour dots; the last row opens the project manager. */
export function ProjectSwitcher({ onManage }: { onManage: () => void }) {
  const { state, set } = useStore()
  const t = UI[state.locale]
  const { visible } = useProjects()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = projectById(state.brand)

  useEffect(() => {
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <div className="pswitch" ref={ref}>
      <button type="button" className="pswitch__btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="pswitch__dot" style={{ background: current.colors.primary, boxShadow: `0 0 12px ${current.colors.primary}88` }} />
        <b>{current.short}</b>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="pswitch__menu" role="menu">
          <div className="pswitch__label">{t.projects}</div>
          {visible.map((p) => (
            <button type="button" role="menuitem" key={p.id} className={`pswitch__item ${p.id === state.brand ? 'is-active' : ''}`}
              onClick={() => { set({ brand: p.id }); setOpen(false) }}>
              <span className="pswitch__dot" style={{ background: `linear-gradient(135deg, ${p.colors.primary} 50%, ${p.colors.secondary} 50%)` }} />
              <span className="pswitch__text"><b>{p.short}</b><span>{p.name} · {p.icao}</span></span>
              {p.id === state.brand && <Check size={14} />}
            </button>
          ))}
          <button type="button" className="pswitch__item pswitch__item--manage" onClick={() => { setOpen(false); onManage() }}>
            <Settings2 size={15} /> {t.manageProjects}
          </button>
        </div>
      )}
    </div>
  )
}
