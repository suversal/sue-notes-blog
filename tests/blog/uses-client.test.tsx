// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UsesClient } from '../../src/app/blog/components/uses-client'
import type { UsesCategory, UsesItem } from '../../src/lib/uses-service'

vi.mock('next/dynamic', () => ({
  default: () => (props: { category?: UsesCategory; item?: UsesItem }) => (
    <div data-testid="editor">{props.item?.title ?? props.category?.name ?? 'new'}</div>
  ),
}))

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

const categories: UsesCategory[] = [
  { id: 'servers', name: '服务器', subtitle: '备用节点', note: '主力和备用分开。', sortOrder: 10 },
  { id: 'cards', name: '银行卡', subtitle: '', note: '', sortOrder: 20 },
  { id: 'empty', name: '机场', subtitle: '', note: '', sortOrder: 30 },
]
const item = (overrides: Partial<UsesItem>): UsesItem => ({
  id: 'oracle', categoryId: 'servers', title: 'Oracle Cloud', tagline: '4C24G 免费额度', tags: 'ARM、免费额度',
  description: '仍然是 **4C24G** 的额度。', status: 'using', href: 'https://example.com/oracle', ctaLabel: '注册',
  isAffiliate: false, promoNote: '', logoUrl: '', relatedLinks: [], isVisible: true, sortOrder: 10, ...overrides,
})
const items = [
  item({ relatedLinks: [{ label: '注册教程', href: '/blog/oracle' }, { label: 'X 上的补充', href: 'https://x.com/post' }] }),
  item({ id: 'draft', title: '未公开的机器', isVisible: false, sortOrder: 20 }),
  item({ id: 'wise', categoryId: 'cards', title: 'Wise', isAffiliate: true, promoNote: '首笔转账免手续费', href: 'https://example.com/wise?ref=1' }),
]

describe('在用页面', () => {
  it('访客一次看一个分类，看不到隐藏条目和空分类', () => {
    render(<UsesClient categories={categories} items={items} />)
    const chips = within(screen.getByRole('group', { name: '分类' }))
    expect(chips.getAllByRole('button').map((button) => button.textContent)).toEqual(['服务器 1', '银行卡 1'])
    expect(screen.getByRole('heading', { level: 2, name: '服务器' })).toBeTruthy()
    expect(screen.getByText('备用节点')).toBeTruthy()
    expect(screen.getByText('主力和备用分开。')).toBeTruthy()
    expect(screen.queryByText('未公开的机器')).toBeNull()
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull()
  })

  it('卡片显示卖点、标签、加粗说明、多条相关文章和自定义按钮文字', () => {
    render(<UsesClient categories={categories} items={items} />)
    expect(screen.getByText('4C24G 免费额度')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: '标签' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('4C24G').tagName).toBe('STRONG')
    expect(screen.getByRole('button', { name: '相关文章 2 篇' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1. 注册教程' }).getAttribute('href')).toBe('/blog/oracle')
    expect(screen.getByRole('link', { name: '2. X 上的补充' }).getAttribute('target')).toBe('_blank')
    expect(within(screen.getByRole('group', { name: '相关文章' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['1. 注册教程', '2. X 上的补充'])
    expect(screen.getByRole('link', { name: '注册' }).getAttribute('href')).toBe('https://example.com/oracle')
  })

  it('切换分类会更新地址，邀请链接带 sponsored 并显示优惠说明', () => {
    render(<UsesClient categories={categories} items={items} />)
    fireEvent.click(screen.getByRole('button', { name: /银行卡/ }))
    expect(decodeURIComponent(window.location.hash)).toBe('#银行卡')
    expect(screen.getByText('首笔转账免手续费')).toBeTruthy()
    expect(screen.getByRole('link', { name: '注册' }).getAttribute('rel')).toContain('sponsored')
  })

  it('地址里带分类名时直接打开那个分类', () => {
    window.history.replaceState(null, '', `/#${encodeURIComponent('银行卡')}`)
    render(<UsesClient categories={categories} items={items} />)
    expect(screen.getByRole('heading', { level: 2, name: '银行卡' })).toBeTruthy()
  })

  it('所有者进入编辑后能看到隐藏条目、空分类和添加入口', () => {
    render(<UsesClient categories={categories} items={items} canEdit />)
    expect(screen.queryByText('未公开的机器')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    expect(screen.getByRole('heading', { level: 3, name: '未公开的机器' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /机场/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '添加' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '分类' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(screen.queryByRole('button', { name: '添加' })).toBeNull()
  })
})
