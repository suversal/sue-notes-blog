// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AdminShell } from '../../src/app/articles/components/admin-shell'
import { PublicShell } from '../../src/app/blog/components/public-shell'
import type { SiteProfile } from '../../src/lib/blog-data'

const route = vi.hoisted(() => ({ pathname: '/blog' }))

vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('../../src/app/login/actions', () => ({ signOut: vi.fn() }))
vi.mock('../../src/app/components/theme-settings', () => ({
  ThemeSettings: () => <button aria-label="主题设置" />,
}))

const site: SiteProfile = {
  siteName: '苏码手记',
  authorName: 'Sue',
  tagline: '写下来，慢慢来。',
  authorBio: '作者介绍',
}

afterEach(cleanup)

describe('主题设置入口', () => {
  it('公开博客挂载时关闭全局纸张纹理，卸载后恢复', () => {
    route.pathname = '/blog'
    const { unmount } = render(
      <PublicShell site={site} searchPosts={[]}>
        <main>博客内容</main>
      </PublicShell>,
    )

    expect(document.body.classList.contains('publicBlogBody')).toBe(true)
    unmount()
    expect(document.body.classList.contains('publicBlogBody')).toBe(false)
  })

  it('后台管理页面不显示主题设置', () => {
    route.pathname = '/articles'
    render(
      <AdminShell siteName={site.siteName} authorName={site.authorName} articleCount={1}>
        <main>后台内容</main>
      </AdminShell>,
    )
    expect(screen.queryByRole('button', { name: '主题设置' })).toBeNull()
  })

  it.each([
    '/blog',
    '/blog/archive',
    '/blog/explore',
    '/blog/about',
    '/blog/a-public-article',
  ])('%s 显示主题设置', (pathname) => {
    route.pathname = pathname
    render(
      <PublicShell site={site} searchPosts={[]}>
        <main>博客内容</main>
      </PublicShell>,
    )
    expect(screen.getByRole('button', { name: '主题设置' })).toBeTruthy()
  })
})
