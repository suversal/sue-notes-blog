import type { Metadata } from 'next'
import { ExploreClient } from '../components/explore-client'
import { listExploreItems } from '../../../lib/explore-service'

export const metadata: Metadata = {
  title: '探索 · 苏码手记',
  description: 'Sue 的开源项目、网站与互联网收藏。',
  alternates: { canonical: '/blog/explore' },
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const items = await listExploreItems()
  return (
    <main id="main-content" tabIndex={-1}>
      <ExploreClient items={items} />
    </main>
  )
}
