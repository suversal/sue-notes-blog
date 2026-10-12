export type RepoStats = { stars: number; forks: number; language: string; pushedAt: string }

const REFRESH_MS = 6 * 60 * 60 * 1000
const RETRY_MS = 10 * 60 * 1000

// 每个 GitHub 账号缓存一份：{ 取到的仓库数据, 下次允许请求的时间 }。
// 进程内缓存就够用：站点是单个常驻容器，重启后第一次访问会重新取一次。
const cache = new Map<string, { repos: Map<string, RepoStats>; nextFetchAt: number }>()
// 正在进行的刷新，按账号记一份：同时到来的访问共用这一次请求，不各发各的。
const refreshing = new Map<string, Promise<void>>()

/** 从条目地址里认出 GitHub 仓库，例如 https://github.com/suversal/WrapPin → suversal/wrappin。 */
export function githubRepoKey(href: string) {
  const match = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[?#].*)?$/i.exec(href.trim())
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : undefined
}

async function fetchOwnerRepos(owner: string) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&type=owner`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'suversal-blog' },
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  })
  if (!response.ok) throw new Error(`GitHub responded ${response.status}`)
  const rows = (await response.json()) as { full_name: string; stargazers_count: number; forks_count: number; language: string | null; pushed_at: string }[]
  return new Map(rows.map((row) => [row.full_name.toLowerCase(), { stars: row.stargazers_count, forks: row.forks_count, language: row.language ?? '', pushedAt: row.pushed_at }] as const))
}

/**
 * 返回每个仓库的 Star、Fork、主要语言和最近推送时间，每 6 小时向 GitHub 刷新一次。
 * GitHub 访问失败时沿用上一次的结果，并在 10 分钟后才重试，不拖慢页面。
 */
export async function getRepoStats(hrefs: string[], now = Date.now()): Promise<Map<string, RepoStats>> {
  const keys = [...new Set(hrefs.map(githubRepoKey).filter((key): key is string => Boolean(key)))]
  const owners = [...new Set(keys.map((key) => key.split('/')[0]))]
  await Promise.all(owners.map(async (owner) => {
    const cached = cache.get(owner)
    if (cached && now < cached.nextFetchAt) return
    let refresh = refreshing.get(owner)
    if (!refresh) {
      refresh = fetchOwnerRepos(owner)
        .then((repos) => { cache.set(owner, { repos, nextFetchAt: now + REFRESH_MS }) })
        .catch(() => { cache.set(owner, { repos: cached?.repos ?? new Map(), nextFetchAt: now + RETRY_MS }) })
        .finally(() => { refreshing.delete(owner) })
      refreshing.set(owner, refresh)
    }
    await refresh
  }))
  const result = new Map<string, RepoStats>()
  for (const key of keys) {
    const stats = cache.get(key.split('/')[0])?.repos.get(key)
    if (stats) result.set(key, stats)
  }
  return result
}
