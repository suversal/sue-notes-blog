import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRepoStats, githubRepoKey } from '../../src/lib/github-stats'

afterEach(() => vi.unstubAllGlobals())

const reply = (rows: unknown) => ({ ok: true, json: async () => rows }) as Response

describe('GitHub 仓库数据', () => {
  it('只认 github.com 上的仓库地址', () => {
    expect(githubRepoKey('https://github.com/Suversal/WrapPin')).toBe('suversal/wrappin')
    expect(githubRepoKey('https://github.com/suversal/WrapPin/')).toBe('suversal/wrappin')
    expect(githubRepoKey('https://github.com/suversal')).toBeUndefined()
    expect(githubRepoKey('https://radar.suversal.com')).toBeUndefined()
    expect(githubRepoKey('/blog')).toBeUndefined()
  })

  it('6 小时内复用缓存；过期后刷新；GitHub 出错时沿用上一次的数据', async () => {
    const fetchMock = vi.fn(async () => reply([{ full_name: 'cache-owner/Repo', stargazers_count: 5, forks_count: 2, language: 'Rust', pushed_at: '2026-10-01T00:00:00Z' }]))
    vi.stubGlobal('fetch', fetchMock)
    const href = ['https://github.com/cache-owner/repo']
    const start = 1_000_000
    expect((await getRepoStats(href, start)).get('cache-owner/repo')).toEqual({ stars: 5, forks: 2, language: 'Rust', pushedAt: '2026-10-01T00:00:00Z' })
    await getRepoStats(href, start + 5 * 60 * 60 * 1000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockImplementationOnce(async () => { throw new Error('network down') })
    const stale = await getRepoStats(href, start + 7 * 60 * 60 * 1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(stale.get('cache-owner/repo')?.stars).toBe(5)

    // 出错后 10 分钟内不再重试
    await getRepoStats(href, start + 7 * 60 * 60 * 1000 + 60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('同时到来的访问共用一次 GitHub 请求', async () => {
    const fetchMock = vi.fn(async () => reply([{ full_name: 'busy-owner/Repo', stargazers_count: 3, forks_count: 1, language: 'Go', pushed_at: '2026-10-01T00:00:00Z' }]))
    vi.stubGlobal('fetch', fetchMock)
    const results = await Promise.all(Array.from({ length: 8 }, () => getRepoStats(['https://github.com/busy-owner/repo'], 1_000_000)))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results.every((result) => result.get('busy-owner/repo')?.stars === 3)).toBe(true)
  })

  it('没有 GitHub 链接时不发请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await getRepoStats(['/blog', 'https://example.com'])).size).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
