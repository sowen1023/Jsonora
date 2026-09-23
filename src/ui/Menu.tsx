import { useEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { Check } from './Icons'

export interface MenuItem {
  label: string
  hint?: string
  icon?: ComponentChildren
  checked?: boolean
  disabled?: boolean
  onClick: () => void
}

export type MenuEntry = MenuItem | 'separator'

interface MenuProps {
  entries: MenuEntry[]
  title: string
  icon?: ComponentChildren
  label?: string
  align?: 'left' | 'right'
  menubar?: boolean
}

export function Menu({ entries, title, icon, label, align = 'right', menubar = false }: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: Event) => {
      // `composedPath` rather than `contains`: inside a shadow root the event is retargeted
      // to the host by the time it reaches the document, so `contains` would always be false.
      const path = event.composedPath()
      if (wrap.current && !path.includes(wrap.current)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div class="jr-menu-wrap" ref={wrap}>
      <button
        class={`${open ? 'jr-btn is-active' : 'jr-btn'}${menubar ? ' jr-menu-trigger' : ''}`}
        type="button"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        {label && <span class="jr-btn-label">{label}</span>}
        {menubar && <span class="jr-menu-caret" aria-hidden="true" />}
      </button>
      {open && (
        <div class="jr-menu" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} role="menu">
          {entries.map((entry, i) =>
            entry === 'separator' ? (
              <div key={i} class="jr-menu-sep" />
            ) : (
              <button
                key={i}
                class={`jr-menu-item${entry.checked ? ' is-checked' : ''}${entry.icon ? '' : ' is-no-icon'}`}
                type="button"
                role={entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={entry.checked === undefined ? undefined : entry.checked}
                disabled={entry.disabled}
                onClick={() => {
                  setOpen(false)
                  entry.onClick()
                }}
              >
                <span class="jr-menu-icon">{entry.icon}</span>
                <span class="jr-menu-label">{entry.label}</span>
                {entry.hint && <span class="jr-menu-hint">{entry.hint}</span>}
                {entry.checked && <Check class="jr-menu-check" size={13} />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
