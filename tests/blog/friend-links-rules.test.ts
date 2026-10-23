import { describe, expect, it } from 'vitest'
import { earliestMetMonth, friendDomain, friendHue, friendTilt, shortMotto } from '../../src/lib/friend-links-labels'
import { parseFriendCardInput, parseFriendLinkInput } from '../../src/lib/friend-links-service'

const friend = {
  name: ' 林间纪事 ', url: 'https://lin.example.com', motto: '记录山里的周末。', metAt: '2024-05-12',
}

describe('友邻规则', () => {
  it('站长、头像和推荐语可以留空，文字去掉首尾空白', () => {
    expect(parseFriendLinkInput({ ...friend, isVisible: true })).toEqual({
      name: '林间纪事', author: '', url: 'https://lin.example.com', avatarUrl: '', motto: '记录山里的周末。',
      note: '', metAt: '2024-05-12', isVisible: true,
    })
  })

  it('网址必须是完整的 http(s) 链接，站内路径和脚本地址都不行', () => {
    expect(() => parseFriendLinkInput({ ...friend, url: '/blog' })).toThrow('http(s)')
    expect(() => parseFriendLinkInput({ ...friend, url: 'javascript:alert(1)' })).toThrow('http(s)')
    expect(() => parseFriendLinkInput({ ...friend, url: '' })).toThrow('网址')
    expect(() => parseFriendLinkInput({ ...friend, avatarUrl: '/a.png' })).toThrow('头像地址')
  })

  it('结识日期只接受真实存在的 YYYY-MM-DD', () => {
    expect(() => parseFriendLinkInput({ ...friend, metAt: '' })).toThrow('结识日期')
    expect(() => parseFriendLinkInput({ ...friend, metAt: '2025-02-30' })).toThrow('结识日期')
    expect(() => parseFriendLinkInput({ ...friend, metAt: '2025/03/14' })).toThrow('结识日期')
    expect(parseFriendLinkInput({ ...friend, metAt: '2024-02-29' }).metAt).toBe('2024-02-29')
  })

  it('站名、一句话介绍必填且有长度上限', () => {
    expect(() => parseFriendLinkInput({ ...friend, name: '' })).toThrow('站名')
    expect(() => parseFriendLinkInput({ ...friend, motto: '长'.repeat(81) })).toThrow('一句话介绍')
    expect(() => parseFriendLinkInput({ ...friend, note: '长'.repeat(121) })).toThrow('推荐语')
  })

  it('卡片上的域名、倾斜角和底色按网址算出，刷新后不变', () => {
    expect(friendDomain('https://lin.example.com/about')).toBe('lin.example.com')
    expect(friendTilt('https://lin.example.com')).toBe(friendTilt('https://lin.example.com'))
    expect(Math.abs(friendTilt('https://a.example.com'))).toBeLessThanOrEqual(9)
    expect(friendHue('https://lin.example.com')).toBeGreaterThanOrEqual(0)
    expect(friendHue('https://lin.example.com')).toBeLessThan(360)
    expect(earliestMetMonth(['2025-03-14', '2024-05-12'])).toBe('2024.05')
    expect(earliestMetMonth([])).toBe('')
  })

  it('信纸上的本站信息都能留空，填了就要合法', () => {
    expect(parseFriendCardInput({ name: '', url: '', avatar: '', motto: '' })).toEqual({ name: '', url: '', avatar: '', motto: '' })
    expect(parseFriendCardInput({ name: ' 苏码手记 ', url: 'https://suversal.com', avatar: 'https://suversal.com/icon.png', motto: '写下来，慢慢来。' })).toEqual({
      name: '苏码手记', url: 'https://suversal.com', avatar: 'https://suversal.com/icon.png', motto: '写下来，慢慢来。',
    })
    expect(() => parseFriendCardInput({ url: '/blog' })).toThrow('http(s)')
    expect(() => parseFriendCardInput({ avatar: 'icon.png' })).toThrow('头像地址')
    expect(() => parseFriendCardInput({ motto: '长'.repeat(41) })).toThrow('一句话')
  })

  it('信纸上的一句话只取站点标语冒号前的第一句', () => {
    expect(shortMotto('一个程序员的折腾记录：VPS、家庭网络、还有AI')).toBe('一个程序员的折腾记录。')
    expect(shortMotto('一个程序员的折腾记录：Apple 生态、出海基建，还有 AI。')).toBe('一个程序员的折腾记录。')
    expect(shortMotto('写下来，慢慢来。')).toBe('写下来，慢慢来。')
  })
})
