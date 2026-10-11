// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ExploreClient } from '../../src/app/blog/components/explore-client'
import type { ExploreItem } from '../../src/lib/explore-service'

vi.mock('../../src/app/blog/components/reveal', () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('next/dynamic', () => ({
  default: () => (props: { item?: ExploreItem }) => <div data-testid="editor">{props.item?.id ?? 'new'}</div>,
}))

afterEach(cleanup)

const item = (overrides: Partial<ExploreItem>): ExploreItem => ({
  id: 'project', kind: 'project', eyebrow: '开源项目', title: '项目', description: '项目简介',
  meta: 'iOS · 开发工具', status: '持续维护', href: 'https://github.com/owner/project', logoUrl: '',
  relatedLinks: [], isFeatured: false, highlightStatus: false, isVisible: true, sortOrder: 10, ...overrides,
})
const items = [
  item({ id: 'star', title: '重点项目', isFeatured: true, relatedLinks: [{ label: '项目教程', href: '/blog/project-guide' }] }),
  item({}),
  item({ id: 'site', kind: 'site', title: '站点', meta: 'example.com', status: '运行中', href: '/blog', highlightStatus: true, sortOrder: 20 }),
  item({ id: 'draft', title: '没公开的项目', isVisible: false, sortOrder: 30 }),
]
const stats = {
  star: { stars: 476, forks: 31, language: 'Swift', pushedAt: '2026-10-11T03:00:00Z' },
  project: { stars: 1, forks: 0, language: 'Python', pushedAt: '2026-09-01T03:00:00Z' },
}

describe('探索页', () => {
  it('按分类分组，没有条目的分类和隐藏条目不显示', () => {
    render(<ExploreClient items={items} stats={stats} />)
    expect(screen.getByRole('heading', { level: 2, name: '开源项目' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: '我的站点' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 2, name: '收藏' })).toBeNull()
    expect(screen.queryByText('没公开的项目')).toBeNull()
    expect(screen.getByRole('link', { name: '站点' }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull()
  })

  it('重点项目显示 Star、Fork、语言和相关文章，普通项目只显示语言', () => {
    render(<ExploreClient items={items} stats={stats} />)
    expect(screen.getByLabelText('476 个 Star')).toBeTruthy()
    expect(screen.getByLabelText('31 个 Fork')).toBeTruthy()
    expect(screen.getByText('Swift')).toBeTruthy()
    expect(screen.getByText('Python')).toBeTruthy()
    expect(screen.queryByLabelText('1 个 Star')).toBeNull()
    expect(screen.getByRole('button', { name: '相关文章 1 篇' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1. 项目教程' }).getAttribute('href')).toBe('/blog/project-guide')
    expect(within(screen.getAllByRole('list', { name: '标签' })[0]).getAllByRole('listitem').map((tag) => tag.textContent)).toEqual(['iOS', '开发工具'])
  })

  it('取不到 GitHub 数据时卡片照常显示，只是没有数字', () => {
    render(<ExploreClient items={items} />)
    expect(screen.getByRole('link', { name: '重点项目' })).toBeTruthy()
    expect(screen.queryByLabelText(/个 Star/)).toBeNull()
  })

  it('所有者进入编辑后能看到隐藏条目、空分组和添加入口', () => {
    render(<ExploreClient items={items} stats={stats} canEdit />)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    expect(screen.getByRole('heading', { level: 3, name: '没公开的项目' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: '收藏' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '添加' })).toHaveLength(3)
  })

  it('没有任何条目时显示真实空状态', () => {
    render(<ExploreClient items={[]} />)
    expect(screen.getByRole('heading', { name: '这里暂时还没有条目' })).toBeTruthy()
  })
})
