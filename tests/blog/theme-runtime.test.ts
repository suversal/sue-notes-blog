// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  BLOG_BACKGROUND_COLORS,
  BLOG_THEME_COLOR_META_ID,
} from '../../src/app/components/theme-runtime'

beforeEach(() => {
  window.history.replaceState({}, '', '/blog')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

afterEach(() => {
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove())
  document.documentElement.removeAttribute('style')
  document.body.removeAttribute('style')
  vi.unstubAllGlobals()
})

describe('博客浏览器主题色', () => {
  it('同步所选主题背景，同时保留 Next 管理的首屏 theme-color 声明', () => {
    const light = document.createElement('meta')
    light.name = 'theme-color'
    light.media = '(prefers-color-scheme: light)'
    const dark = document.createElement('meta')
    dark.name = 'theme-color'
    dark.media = '(prefers-color-scheme: dark)'
    document.head.append(light, dark)

    applyTheme('dark', 'mountain', false)

    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    const runtimeMeta = document.getElementById(BLOG_THEME_COLOR_META_ID) as HTMLMetaElement
    expect(metas).toHaveLength(3)
    expect(metas[0]).toBe(runtimeMeta)
    expect(runtimeMeta.content).toBe(BLOG_BACKGROUND_COLORS.mountain.dark)
    expect(runtimeMeta.hasAttribute('media')).toBe(false)
    expect(document.documentElement.style.backgroundColor).toBe('rgb(23, 25, 35)')
    expect(document.body.style.backgroundColor).toBe('rgb(23, 25, 35)')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('写作后台和前台一样同步浏览器栏和页面背景', () => {
    window.history.replaceState({}, '', '/articles/topics')

    applyTheme('dark', 'journal', false)

    const runtimeMeta = document.getElementById(BLOG_THEME_COLOR_META_ID) as HTMLMetaElement
    expect(runtimeMeta.content).toBe(BLOG_BACKGROUND_COLORS.journal.dark)
    expect(document.documentElement.style.backgroundColor).toBe('rgb(24, 27, 26)')
    expect(document.body.style.backgroundColor).toBe('rgb(24, 27, 26)')
  })

  it('不会修改前台和后台之外页面的浏览器栏和页面背景', () => {
    window.history.replaceState({}, '', '/login')

    applyTheme('dark', 'journal', false)

    expect(document.querySelector('meta[name="theme-color"]')).toBeNull()
    expect(document.documentElement.style.backgroundColor).toBe('')
    expect(document.body.style.backgroundColor).toBe('')
  })

  it('离开后台到登录页时撤掉之前写上的颜色', () => {
    window.history.replaceState({}, '', '/articles')
    applyTheme('dark', 'journal', false)
    window.history.replaceState({}, '', '/login')

    applyTheme('dark', 'journal', false)

    expect(document.querySelector('meta[name="theme-color"]')).toBeNull()
    expect(document.documentElement.style.backgroundColor).toBe('')
    expect(document.body.style.backgroundColor).toBe('')
    expect(document.documentElement.style.colorScheme).toBe('')
  })
})
