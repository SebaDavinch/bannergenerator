import { useId, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Card({ title, hint, actions, children, icon: Icon }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode; icon?: LucideIcon }) {
  return (
    <section className="card">
      <header className="card__head">
        {Icon && <span className="card__icon"><Icon size={15} strokeWidth={1.9} /></span>}
        <div className="card__titles">
          <h3 className="card__title">{title}</h3>
          {hint && <p className="card__hint">{hint}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </header>
      <div className="card__body">{children}</div>
    </section>
  )
}

export function Field({ label, hint, children, span }: { label?: string; hint?: string; children: ReactNode; span?: 1 | 2 }) {
  return (
    <label className={`field ${span === 2 ? 'field--span' : ''}`}>
      {label && <span className="field__label">{label}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={`grid grid--${cols}`}>{children}</div>
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { onValue?: (v: string) => void; mono?: boolean }
export function TextInput({ onValue, mono, className = '', ...rest }: InputProps) {
  return <input className={`input ${mono ? 'input--mono' : ''} ${className}`} onChange={(e) => onValue?.(e.target.value)} {...rest} />
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & { onValue?: (v: string) => void }
export function TextArea({ onValue, className = '', ...rest }: AreaProps) {
  return <textarea className={`input input--area ${className}`} onChange={(e) => onValue?.(e.target.value)} {...rest} />
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId()
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track"><span className="switch__thumb" /></span>
      <span className="switch__label">{label}</span>
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} title={o.title}
          className={`segmented__opt ${o.value === value ? 'is-active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Select<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="select">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="slider">
      <span className="slider__row">
        <span className="field__label">{label}</span>
        <span className="slider__value">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function Button({ children, variant = 'secondary', size = 'md', icon: Icon, className = '', ...rest }: {
  children?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn btn--${variant} btn--${size} ${!children ? 'btn--icon' : ''} ${className}`} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.9} />}
      {children}
    </button>
  )
}

export function Chip({ active, children, onClick, title }: { active?: boolean; children: ReactNode; onClick?: () => void; title?: string }) {
  return <button type="button" title={title} className={`chip ${active ? 'is-active' : ''}`} onClick={onClick}>{children}</button>
}

export function Flag({ cc, className = '' }: { cc?: string; className?: string }) {
  if (!cc) return null
  return <span className={`fi fi-${cc.toLowerCase()} flag ${className}`} />
}
