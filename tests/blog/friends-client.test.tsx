// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { FriendsClient } from '../../src/app/(site)/blog/components/friends-client'
import type { FriendLink } from '../../src/lib/friend-links-service'

vi.mock('next/dynamic', () => ({
  default: () => (props: { friend?: FriendLink; card?: unknown }) => (
    <div data-testid="editor">{props.card ? 'letter' : props.friend?.name ?? 'new'}</div>
  ),
}))
vi.mock('../../src/app/(site)/blog/components/friends-comments', () => ({ FriendsComments: () => null }))

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const self = { name: '苏码玩家', url: 'https://suversal.com', avatar: 'https://suversal.com/icon.svg', motto: '一个程序员的折腾记录。', author: 'Sue' }
const friend = (overrides: Partial<FriendLink>): FriendLink => ({
  id: 'lin', name: '林间纪事', author: '阿林', url: 'https://lin.example.com', avatarUrl: '', motto: '记录山里的周末。',
  note: '徒步那几篇我收藏到现在。', metAt: '2024-05-12', isVisible: true, sortOrder: 10, ...overrides,
})
const friends = [
  friend({}),
  friend({ id: 'tea', name: 'Byte & Tea', author: '', url: 'https://byteandtea.example.dev', avatarUrl: 'https://img.example.com/tea.png', note: '', metAt: '2025-03-14', sortOrder: 20 }),
  friend({ id: 'hidden', name: '还没公开的站', url: 'https://hidden.example.com', isVisible: false, sortOrder: 30 }),
]

describe('友邻页面', () => {
  it('访客只看到公开的明信片，整张卡片都是新窗口打开的外链', () => {
    render(<FriendsClient friends={friends} self={self} />)
    const list = within(screen.getByRole('region', { name: '友链列表' }))
    const links = list.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://lin.example.com', 'https://byteandtea.example.dev'])
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(screen.queryByText('还没公开的站')).toBeNull()
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull()
  })

  it('卡片显示编号、邮戳日期、推荐语和域名；有头像用头像，没有就用站名首字', () => {
    render(<FriendsClient friends={friends} self={self} />)
    const [lin, tea] = within(screen.getByRole('region', { name: '友链列表' })).getAllByRole('link')
    expect(within(lin).getByText('No.01')).toBeTruthy()
    expect(within(lin).getByText('05·12')).toBeTruthy()
    expect(within(lin).getByText('徒步那几篇我收藏到现在。')).toBeTruthy()
    expect(within(lin).getByText('lin.example.com')).toBeTruthy()
    expect(within(lin).getByText('林')).toBeTruthy()
    expect(tea.querySelector('img')?.getAttribute('src')).toBe('https://img.example.com/tea.png')
    // 没填推荐语的卡片只有一句介绍，不留空引号
    expect(tea.querySelectorAll('p')).toHaveLength(1)
  })

  it('页头统计公开的来信数和最早的结识月份，回信里列出本站信息', () => {
    render(<FriendsClient friends={friends} self={self} />)
    const ledger = within(screen.getByLabelText('统计'))
    expect(ledger.getByText('2')).toBeTruthy()
    expect(ledger.getByText('2024.05')).toBeTruthy()
    expect(screen.getByText('https://suversal.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: '复制地址' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '随便敲一扇门' })).toBeTruthy()
  })

  it('没有公开友邻时显示空状态，不出现统计和串门按钮', () => {
    render(<FriendsClient friends={[friends[2]]} self={self} />)
    expect(screen.getByRole('heading', { name: '还没有友邻' })).toBeTruthy()
    expect(screen.queryByLabelText('统计')).toBeNull()
    expect(screen.queryByRole('button', { name: '随便敲一扇门' })).toBeNull()
  })

  it('所有者进入编辑后能看到隐藏条目和添加入口，卡片不再是链接', () => {
    render(<FriendsClient friends={friends} self={self} canEdit />)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    const list = within(screen.getByRole('region', { name: '友链列表' }))
    expect(list.getByRole('heading', { level: 3, name: '还没公开的站' })).toBeTruthy()
    expect(list.getByText('已隐藏')).toBeTruthy()
    expect(list.queryAllByRole('link')).toHaveLength(0)
    expect(list.getAllByTestId('editor')).toHaveLength(3)
    fireEvent.click(list.getByRole('button', { name: '添加友邻' }))
    expect(list.getAllByTestId('editor').at(-1)?.textContent).toBe('new')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(screen.queryByRole('button', { name: '添加友邻' })).toBeNull()
  })

  it('编辑模式下信纸也能原地改，访客看不到入口', () => {
    const card = { name: '', url: '', avatar: '', motto: '' }
    const defaults = { name: self.name, url: self.url, avatar: self.avatar, motto: self.motto }
    const { unmount } = render(<FriendsClient friends={friends} self={self} />)
    expect(screen.queryByRole('button', { name: '编辑信纸' })).toBeNull()
    unmount()
    render(<FriendsClient friends={friends} self={self} card={card} cardDefaults={defaults} canEdit />)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.click(screen.getByRole('button', { name: '编辑信纸' }))
    expect(screen.queryByText('致新朋友：')).toBeNull()
    expect(screen.getAllByTestId('editor').some((editor) => editor.textContent === 'letter')).toBe(true)
  })
})
