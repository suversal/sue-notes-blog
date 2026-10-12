'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  applyTheme,
  PALETTE_STORAGE_KEY,
  readStoredThemeSettings,
  THEME_STORAGE_KEY,
} from './theme-runtime'

export function ThemeSync() {
  // 站内跳转不会重新挂载本组件，路径变化时要重新同步浏览器栏和页面底色。
  const pathname = usePathname()
  useEffect(() => {
    const syncStoredTheme = (withTransition = false) => {
      const { palette, preference } = readStoredThemeSettings()
      applyTheme(preference, palette, withTransition)
    }
    const syncSystemTheme = () => {
      const { palette, preference } = readStoredThemeSettings()
      if (preference === 'system') applyTheme(preference, palette)
    }
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === PALETTE_STORAGE_KEY) {
        syncStoredTheme(true)
      }
    }

    syncStoredTheme()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener?.('change', syncSystemTheme)
    window.addEventListener('storage', syncAcrossTabs)
    return () => {
      media.removeEventListener?.('change', syncSystemTheme)
      window.removeEventListener('storage', syncAcrossTabs)
    }
  }, [pathname])

  return null
}
