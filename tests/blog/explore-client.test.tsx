// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ExploreClient } from '../../src/app/blog/components/explore-client'
import type { ExploreItem } from '../../src/lib/explore-service'

afterEach(cleanup)

const items: ExploreItem[] = [
  {
    id: 'project', kind: 'project', eyebrow: 'OPEN SOURCE', title: '项目',
    description: '项目简介', meta: '工具', status: '维护中', href: 'https://example.com/project',
    highlightStatus: false, isVisible: true, sortOrder: 10,
  },
  {
    id: 'site', kind: 'site', eyebrow: 'MY SITE', title: '站点',
    description: '站点简介', meta: 'example.com', status: '运行中', href: '/blog',
    highlightStatus: true, isVisible: true, sortOrder: 20,
  },
]

describe('探索页配置内容', () => {
  it('根据传入条目计算数量并筛选', () => {
    render(<ExploreClient items={items} />)
    const filters = screen.getByRole('group', { name: '内容类型' })
    expect(within(filters).getByRole('button', { name: /全部/ }).textContent).toContain('02')
    expect(within(filters).getByRole('button', { name: /网站收藏/ }).textContent).toContain('00')
    fireEvent.click(within(filters).getByRole('button', { name: /我的站点/ }))
    expect(screen.getByRole('link', { name: /站点/ }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('link', { name: /项目/ })).toBeNull()
  })

  it('没有收藏时显示真实空状态', () => {
    render(<ExploreClient items={items} />)
    fireEvent.click(screen.getByRole('button', { name: /网站收藏/ }))
    expect(screen.getByRole('heading', { name: '收藏清单正在整理。' })).toBeTruthy()
  })
})
