'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../blog/components/ui-icon'
import {
  applyTheme,
  DEFAULT_PALETTE,
  DEFAULT_THEME,
  PALETTE_STORAGE_KEY,
  readStoredThemeSettings,
  THEME_STORAGE_KEY,
  type BlogPalette,
  type ThemePreference,
} from './theme-runtime'
import styles from './theme-settings.module.css'

const modes: ReadonlyArray<{
  value: ThemePreference
  label: string
  icon: 'sun' | 'monitor' | 'moon'
}> = [
  { value: 'light', label: '日间', icon: 'sun' },
  { value: 'system', label: '跟随系统', icon: 'monitor' },
  { value: 'dark', label: '夜间', icon: 'moon' },
]

const palettes: ReadonlyArray<{ value: BlogPalette; label: string; swatch: string }> = [
  { value: 'journal', label: '信号绿', swatch: '#147a4a' },
  { value: 'paper', label: '经典橙', swatch: '#b94f2f' },
  { value: 'mountain', label: '雷达蓝', swatch: '#3157c8' },
  { value: 'indigo', label: '墨靛紫', swatch: '#514596' },
]

export function ThemeSettings({ className = '' }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>(DEFAULT_THEME)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [palette, setPalette] = useState<BlogPalette>(DEFAULT_PALETTE)
  const [open, setOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      const { palette: nextPalette, preference: nextPreference } = readStoredThemeSettings()
      setPreference(nextPreference)
      setPalette(nextPalette)
      setResolvedTheme(applyTheme(nextPreference, nextPalette, false))
    }, 0)
    return () => window.clearTimeout(hydrate)
  }, [])

  useEffect(() => {
    if (preference !== 'system') return
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncWithSystem = () => setResolvedTheme(applyTheme('system', palette))
    media.addEventListener?.('change', syncWithSystem)
    return () => media.removeEventListener?.('change', syncWithSystem)
  }, [palette, preference])

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const chooseMode = (next: ThemePreference) => {
    setPreference(next)
    localStorage.setItem(THEME_STORAGE_KEY, next)
    setResolvedTheme(applyTheme(next, palette))
  }

  const choosePalette = (next: BlogPalette) => {
    setPalette(next)
    localStorage.setItem(PALETTE_STORAGE_KEY, next)
    setResolvedTheme(applyTheme(preference, next))
  }

  const triggerMode = modes.find((mode) => mode.value === preference) ?? modes[1]
  const activePalette = palettes.find((item) => item.value === palette) ?? palettes[0]

  return (
    <div ref={settingsRef} className={`${styles.settings} ${className}`}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-label={`主题设置，当前${triggerMode.label}、${activePalette.label}`}
        aria-expanded={open}
        aria-controls="theme-settings-panel"
        title="主题设置"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.themeIcon} key={`${preference}-${resolvedTheme}`}>
          <Icon name={triggerMode.icon} />
        </span>
      </button>

      <div
        id="theme-settings-panel"
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-label="外观设置"
        aria-hidden={!open}
      >
        <div className={styles.optionGroup} role="radiogroup" aria-label="明暗主题">
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={preference === mode.value}
              aria-label={mode.label}
              title={mode.label}
              tabIndex={open ? 0 : -1}
              className={`${styles.optionButton} ${preference === mode.value ? styles.activeMode : ''}`}
              onClick={() => chooseMode(mode.value)}
            >
              <Icon name={mode.icon} />
            </button>
          ))}
        </div>

        <span className={styles.divider} aria-hidden />

        <div className={styles.optionGroup} role="radiogroup" aria-label="主题色">
          {palettes.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={palette === option.value}
              aria-label={option.label}
              title={option.label}
              tabIndex={open ? 0 : -1}
              className={`${styles.optionButton} ${palette === option.value ? styles.activePalette : ''}`}
              onClick={() => choosePalette(option.value)}
            >
              <span className={styles.swatch} style={{ backgroundColor: option.swatch }} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
