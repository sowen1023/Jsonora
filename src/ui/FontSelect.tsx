import { useEffect, useRef, useState } from 'preact/hooks'
import type { CodeFont } from '@/platform/settings'
import { Check } from './Icons'
import { CODE_FONT_CHOICES, CODE_FONT_STACKS } from './metrics'

interface FontSelectProps {
  value: CodeFont
  language: 'zh' | 'en'
  onChange: (font: CodeFont) => void
}

function choiceLabel(value: CodeFont): string {
  return CODE_FONT_CHOICES.find((choice) => choice.value === value)?.label ?? value
}

export function FontSelect({ value, language, onChange }: FontSelectProps) {
  const label = language === 'zh' ? '代码字体' : 'Code font'
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const positionMenu = () => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 8
    const above = rect.top - 8
    const placeAbove = below < 288 && above > below
    const height = Math.min(288, Math.max(96, (placeAbove ? above : below) - 8))
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`
    menu.style.top = `${placeAbove ? rect.top - height - 8 : rect.bottom + 8}px`
    menu.style.width = `${rect.width}px`
    menu.style.maxHeight = `${height}px`
  }

  const close = () => {
    const menu = menuRef.current
    if (menu?.matches(':popover-open')) menu.hidePopover()
    setOpen(false)
  }

  const show = (focusOption = false) => {
    const menu = menuRef.current
    if (!menu || menu.matches(':popover-open')) return
    positionMenu()
    menu.showPopover()
    setOpen(true)
    if (focusOption) {
      requestAnimationFrame(() => menu.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
    }
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', positionMenu)
    document.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      document.removeEventListener('scroll', positionMenu, true)
    }
  }, [open])

  const handleOptionKey = (event: KeyboardEvent, index: number) => {
    let next = index
    if (event.key === 'ArrowDown') next = Math.min(index + 1, CODE_FONT_CHOICES.length - 1)
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = CODE_FONT_CHOICES.length - 1
    else if (event.key === 'Escape') {
      event.preventDefault()
      close()
      triggerRef.current?.focus()
      return
    } else return
    event.preventDefault()
    menuRef.current?.querySelectorAll<HTMLButtonElement>('.jr-font-picker-option')[next]?.focus()
  }

  return (
    <div class="jr-font-picker">
      <button
        ref={triggerRef}
        type="button"
        class={open ? 'jr-font-picker-trigger is-open' : 'jr-font-picker-trigger'}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? close() : show()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show(true)
          }
        }}
      >
        <span style={{ fontFamily: CODE_FONT_STACKS[value] }}>{choiceLabel(value)}</span>
        <span class="jr-font-picker-chevron" aria-hidden="true" />
      </button>
      <div
        ref={menuRef}
        class="jr-font-picker-menu"
        popover="auto"
        role="listbox"
        aria-label={label}
        onToggle={() => setOpen(menuRef.current?.matches(':popover-open') ?? false)}
      >
        {CODE_FONT_CHOICES.map((choice, index) => (
          <button
            key={choice.value}
            type="button"
            role="option"
            aria-selected={choice.value === value}
            class={choice.value === value ? 'jr-font-picker-option is-selected' : 'jr-font-picker-option'}
            style={{ fontFamily: CODE_FONT_STACKS[choice.value] }}
            onClick={() => {
              onChange(choice.value)
              close()
              triggerRef.current?.focus()
            }}
            onKeyDown={(event) => handleOptionKey(event, index)}
          >
            <span>{choiceLabel(choice.value)}</span>
            <span class="jr-font-picker-sample" aria-hidden="true">Aa 01</span>
            {choice.value === value && <Check size={14} />}
          </button>
        ))}
      </div>
      <div class="jr-font-preview" style={{ fontFamily: CODE_FONT_STACKS[value] }} aria-hidden="true">
        Aa 0O Il1 {'{}'} [] 123
      </div>
    </div>
  )
}
