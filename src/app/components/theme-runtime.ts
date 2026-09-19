export type ThemePreference = 'light' | 'system' | 'dark'
export type BlogPalette = 'journal' | 'paper' | 'mountain' | 'indigo'

export const THEME_STORAGE_KEY = 'sue-notes-theme'
export const PALETTE_STORAGE_KEY = 'sue-notes-palette'
export const DEFAULT_THEME: ThemePreference = 'system'
export const DEFAULT_PALETTE: BlogPalette = 'journal'

const paletteValues: readonly BlogPalette[] = ['journal', 'paper', 'mountain', 'indigo']

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'system' || value === 'dark'
}

function isPalette(value: string | null): value is BlogPalette {
  return paletteValues.some((palette) => palette === value)
}

function systemTheme(): 'light' | 'dark' {
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? systemTheme() : preference
}

export function readStoredThemeSettings() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const savedPalette = localStorage.getItem(PALETTE_STORAGE_KEY)
  return {
    palette: isPalette(savedPalette) ? savedPalette : DEFAULT_PALETTE,
    preference: isThemePreference(savedTheme) ? savedTheme : DEFAULT_THEME,
  }
}

export function applyTheme(
  preference: ThemePreference,
  palette: BlogPalette,
  withTransition = true,
) {
  const root = document.documentElement
  const resolved = resolveTheme(preference)
  root.dataset.blogTheme = resolved
  root.dataset.blogThemePreference = preference
  root.dataset.blogPalette = palette
  if (withTransition) {
    root.dataset.blogTransition = 'true'
    window.setTimeout(() => delete root.dataset.blogTransition, 360)
  }
  return resolved
}
