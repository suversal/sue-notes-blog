// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { startsNavigation } from '../../src/app/components/navigation-progress'

const here = new URL('https://suversal.com/blog/archive?topic=a')

function click(html: string, init: MouseEventInit = {}) {
  document.body.innerHTML = html
  let result = false
  const target = document.querySelector('[data-target]') ?? document.querySelector('a')!
  target.addEventListener('click', (event) => { result = startsNavigation(event as MouseEvent, here) }, { once: true })
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
  return result
}

describe('导航进度条何时出现', () => {
  it('点站内其他页面的链接时出现，包括点在链接内部的元素上', () => {
    expect(click('<a href="/blog/about">关于</a>')).toBe(true)
    expect(click('<a href="/blog/archive?topic=b">换主题</a>')).toBe(true)
    expect(click('<a href="/blog/x"><strong data-target>标题</strong></a>')).toBe(true)
  })

  it('不会真正离开当前页面的点击不出现', () => {
    expect(click('<a href="/blog/archive?topic=a#section-1">本页锚点</a>')).toBe(false)
    expect(click('<a href="https://x.com/post">站外</a>')).toBe(false)
    expect(click('<a href="/blog/about" target="_blank">新标签页</a>')).toBe(false)
    expect(click('<a href="/blog/x/export" download>下载</a>')).toBe(false)
    expect(click('<a href="/blog/about">按住 ⌘ 点击</a>', { metaKey: true })).toBe(false)
    expect(click('<button data-target>按钮</button>')).toBe(false)
  })
})
