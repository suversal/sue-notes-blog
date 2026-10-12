import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ExploreClient } from '../components/explore-client'
import { listExploreItems } from '../../../../lib/explore-service'
import { getRepoStats, githubRepoKey, type RepoStats } from '../../../../lib/github-stats'
import { getPayloadClient } from '../../../../lib/payload'
import { isPublicOwner } from '../../../../lib/uses-service'

export const metadata: Metadata = {
  title: '探索 · 苏码玩家',
  description: 'Sue 的开源项目、网站与互联网收藏。',
  alternates: { canonical: '/blog/explore' },
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const payload = await getPayloadClient()
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  const userId = auth.user ? String(auth.user.id) : undefined
  // 所有者本人能看到隐藏条目并在页面上直接编辑；其他人只拿到公开数据。
  const canEdit = await isPublicOwner(userId)
  const items = await listExploreItems(canEdit ? { owner: userId, includeHidden: true } : {})
  const repoStats = await getRepoStats(items.map((item) => item.href))
  const stats: Record<string, RepoStats> = {}
  for (const item of items) {
    const key = githubRepoKey(item.href)
    const found = key && repoStats.get(key)
    if (found) stats[item.id] = found
  }
  return (
    <main id="main-content" tabIndex={-1}>
      <ExploreClient items={items} stats={stats} canEdit={canEdit} />
    </main>
  )
}
