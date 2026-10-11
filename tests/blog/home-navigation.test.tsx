// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { HomeClient } from '../../src/app/blog/components/home-client'
import type { PublicPost, SiteProfile } from '../../src/lib/blog-data'

vi.mock('../../src/app/blog/components/reveal', () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
const site: SiteProfile = {
  siteName: '测试博客',
  authorName: '作者',
  tagline: '关于工具、创造，以及认真生活的小事。',
  authorBio: '作者介绍',
}
const post = (index: number, topic = { id: 'uncategorized', name: '未分类' }): PublicPost => ({
  id: String(index),
  title: `文章 ${index}`,
  slug: `article-${index}`,
  excerpt: '文章摘要',
  content: {
    root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 },
  },
  plainText: '正文',
  topic,
  coverStyle: 'none',
  pinPriority: 0,
  publishedAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
  publicReferences: [],
})
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('latest_pages') ? [] : {}
      return { ok: true, json: async () => ({ data }) } as Response
    }),
  )
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('首页阅读入口', () => {
  it('空博客也保留两个栏目，不伪造热度', () => {
    render(<HomeClient site={site} posts={[]} />)
    expect(screen.getByRole('heading', { name: '热门排行' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '沿着主题读' })).toBeTruthy()
    expect(screen.getByText('文章发布并产生访问后，这里会显示阅读排行。')).toBeTruthy()
    expect(screen.queryByText(/点赞|评论|演示数据/)).toBeNull()
  })
  it('未分类主题可见且能找回包括精选在内的全部文章', () => {
    render(<HomeClient site={site} posts={[post(0), post(1)]} />)
    const topics = screen.getByRole('region', { name: '沿着主题读' })
    fireEvent.click(within(topics).getByRole('button', { name: /未分类/ }))
    const results = screen.getByRole('region', { name: '文章列表' })
    expect(within(results).getAllByRole('link')).toHaveLength(2)
    expect(within(results).getByRole('link', { name: '文章 0' }).getAttribute('href')).toBe(
      '/blog/article-0',
    )
    expect(document.activeElement?.id).toBe('recent-title')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('文章 0')
    expect(screen.getByText(site.tagline).tagName).toBe('P')
  })
  it('分类筛选保留文章入口，首页首屏最多显示八篇', () => {
    const posts = Array.from({ length: 7 }, (_, index) =>
      post(index, index === 6 ? { id: 'tools', name: '数字工具' } : undefined),
    )
    render(<HomeClient site={site} posts={posts} />)
    const results = screen.getByRole('region', { name: '文章列表' })
    expect(within(results).getAllByRole('link')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: /加载更多/ })).toBeNull()
    expect(screen.queryByText(/已显示全部/)).toBeNull()
    const filters = screen.getByRole('group', { name: '筛选文章主题' })
    fireEvent.click(within(filters).getByRole('button', { name: '数字工具' }))
    const filtered = screen.getByRole('region', { name: '文章列表' })
    expect(within(filtered).getAllByRole('link')).toHaveLength(1)
    expect(within(filtered).getByRole('link', { name: '文章 6' })).toBeTruthy()
    expect(screen.getByRole('list', { name: '近 30 天阅读排行' })).toBeTruthy()
  })
  it('置顶文章进入轮播，同时仍留在按时间排序的列表里', () => {
    const posts = [
      { ...post(1), pinPriority: 2, publishedAt: '2026-09-10T00:00:00.000Z' },
      { ...post(2), pinPriority: 1, publishedAt: '2026-09-11T00:00:00.000Z' },
      { ...post(3), publishedAt: '2026-09-12T00:00:00.000Z' },
    ].sort((a, b) => (b.pinPriority ? 1 : 0) - (a.pinPriority ? 1 : 0) || a.pinPriority - b.pinPriority)
    render(<HomeClient site={site} posts={posts} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('文章 2')
    fireEvent.click(screen.getByRole('button', { name: '下一篇置顶' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('文章 1')
    fireEvent.click(screen.getByRole('button', { name: '下一篇置顶' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('文章 2')
    const results = screen.getByRole('region', { name: '文章列表' })
    expect(within(results).getAllByRole('heading', { level: 3 }).map((item) => item.textContent)).toEqual([
      '文章 3',
      '文章 2',
      '文章 1',
    ])
  })
  it('没有置顶时只展示最新一篇，不显示轮播控件', () => {
    render(<HomeClient site={site} posts={[post(0), post(1)]} />)
    expect(screen.queryByRole('button', { name: '下一篇置顶' })).toBeNull()
    expect(screen.getByText(/最新手记/)).toBeTruthy()
  })
})
