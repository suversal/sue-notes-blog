// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { AdminShell } from '../../src/app/(studio)/articles/components/admin-shell'
import styles from '../../src/app/(studio)/articles/admin-v1.module.css'

const route = vi.hoisted(() => ({ pathname: '/articles' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('../../src/app/(site)/login/actions', () => ({ signOut: vi.fn() }))
afterEach(cleanup)
const shell = () => (
  <AdminShell siteName="苏码手记" authorName="Sue" articleCount={1}>
    <main>页面内容</main>
  </AdminShell>
)

describe('后台导航选中状态', () => {
  it('主题页不会同时高亮文章菜单', () => {
    route.pathname = '/articles/topics'
    render(shell())
    const links = within(screen.getByRole('navigation', { name: '后台导航' })).getAllByRole('link')
    const active = links.filter((link) => link.classList.contains(styles.active))
    expect(active.map((link) => link.getAttribute('href'))).toEqual(['/articles/topics'])
  })
  it.each([
    ['/articles', '/articles'],
    ['/articles/', '/articles'],
    ['/articles/new', '/articles'],
    ['/articles/42', '/articles'],
    ['/articles/42/preview', '/articles'],
    ['/articles/topics', '/articles/topics'],
    ['/articles/topics/', '/articles/topics'],
    ['/articles/settings', '/articles/settings'],
    ['/articles/settings/', '/articles/settings'],
  ])('%s 只有对应入口处于选中状态', (pathname, expected) => {
    route.pathname = pathname
    render(shell())
    const nav = within(screen.getByRole('navigation', { name: '后台导航' }))
    const current = nav.getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('href')).toBe(expected)
    expect(current[0].classList.contains(styles.active)).toBe(true)
    expect(
      nav.getAllByRole('link').filter((link) => link.classList.contains(styles.active)),
    ).toHaveLength(1)
  })
  it('连续切换主题、设置与文章后同步更新选中状态，保留所有入口', () => {
    route.pathname = '/articles'
    const { rerender } = render(shell())
    for (const pathname of [
      '/articles/topics',
      '/articles/settings',
      '/articles/42/preview',
      '/articles',
    ]) {
      route.pathname = pathname
      rerender(shell())
      const nav = within(screen.getByRole('navigation', { name: '后台导航' }))
      const expected = pathname.includes('preview') ? '/articles' : pathname
      expect(
        nav.getAllByRole('link', { current: 'page' }).map((link) => link.getAttribute('href')),
      ).toEqual([expected])
      expect(nav.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
        '/articles',
        '/articles/topics',
        '/blog',
        '/blog/explore',
        '/blog/uses',
        '/articles/settings',
        'http://127.0.0.1:23366/sidebar/',
      ])
    }
  })
})
