'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './studio-select.module.css'

type Option = { value: string; label: string; disabled?: boolean }

export function StudioSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = options.findIndex((option) => option.value === value)
  const show = () => {
    setActive(Math.max(selected, 0))
    setOpen(true)
  }
  const choose = (index: number) => {
    if (options[index]?.disabled) return
    if (options[index]) onChange(options[index].value)
    setOpen(false)
    trigger.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => {
    if (open)
      root.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open])
  return (
    <div
      ref={root}
      className={styles.studioSelect}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.selectTrigger}
        disabled={disabled}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) show()
            else
              setActive(
                (index) =>
                  (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
              )
          }
          if (open && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault()
            setActive(event.key === 'Home' ? 0 : options.length - 1)
          }
          if (open && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            choose(active)
          }
        }}
      >
        <span>{options[selected]?.label || label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div
        id={`${id}-options`}
        className={styles.selectOptions}
        role="listbox"
        aria-label={label}
        aria-hidden={!open}
        data-open={open}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-${index}`}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            data-active={active === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => setActive(index)}
            onClick={() => choose(index)}
          >
            <span>{option.label}</span>
            <span aria-hidden="true">{option.value === value ? '✓' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
