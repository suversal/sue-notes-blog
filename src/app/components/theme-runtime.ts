export type ThemePreference = 'light' | 'system' | 'dark'
export type BlogPalette = 'journal' | 'paper' | 'mountain' | 'indigo'

export const THEME_STORAGE_KEY = 'sue-notes-theme'
export const PALETTE_STORAGE_KEY = 'sue-notes-palette'
export const DEFAULT_THEME: ThemePreference = 'system'
export const DEFAULT_PALETTE: BlogPalette = 'journal'
export const BLOG_THEME_COLOR_META_ID = 'sue-notes-theme-color'

export const BLOG_BACKGROUND_COLORS: Record<
  BlogPalette,
  Record<'light' | 'dark', string>
> = {
  journal: { light: '#efeee8', dark: '#181b1a' },
  paper: { light: '#eee9dc', dark: '#181815' },
  mountain: { light: '#eef0f6', dark: '#171923' },
  indigo: { light: '#efedf6', dark: '#19191d' },
}

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

// 前台和写作后台用的是同一套底色；登录、初始化等页面保持全局样式。
function usesBlogBackground(pathname: string) {
  return /^\/(blog|articles)(\/|$)/.test(pathname)
}

function syncBlogBrowserChrome(theme: 'light' | 'dark', palette: BlogPalette) {
  const root = document.documentElement
  const previous = document.getElementById(BLOG_THEME_COLOR_META_ID) as HTMLMetaElement | null

  if (!usesBlogBackground(window.location.pathname)) {
    // 从前台或后台跳到其他页面时，撤掉之前写上的颜色。
    if (!previous) return
    previous.remove()
    root.style.backgroundColor = ''
    root.style.colorScheme = ''
    if (document.body) document.body.style.backgroundColor = ''
    return
  }

  const color = BLOG_BACKGROUND_COLORS[palette][theme]

  // iOS Safari may keep the previous toolbar color when only `content` changes.
  // Replacing the node makes the browser sample the selected palette immediately.
  const next = document.createElement('meta')
  next.id = BLOG_THEME_COLOR_META_ID
  next.name = 'theme-color'
  next.content = color
  if (previous?.isConnected) previous.replaceWith(next)
  else document.head.prepend(next)

  root.style.backgroundColor = color
  root.style.colorScheme = theme
  if (document.body) document.body.style.backgroundColor = color
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
  syncBlogBrowserChrome(resolved, palette)
  if (withTransition) {
    root.dataset.blogTransition = 'true'
    window.setTimeout(() => delete root.dataset.blogTransition, 360)
  }
  return resolved
}
