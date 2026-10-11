import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { UsesClient } from '../components/uses-client'
import { getPayloadClient } from '../../../lib/payload'
import { isPublicOwner, listUses } from '../../../lib/uses-service'

export const metadata: Metadata = {
  title: '在用 · 苏码玩家',
  description: '我长期在用的服务和工具清单。',
  alternates: { canonical: '/blog/uses' },
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

export default async function UsesPage() {
  const payload = await getPayloadClient()
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  const userId = auth.user ? String(auth.user.id) : undefined
  // 所有者本人能看到隐藏条目并在页面上直接编辑；其他人只拿到公开数据。
  const canEdit = await isPublicOwner(userId)
  const { categories, items } = await listUses(canEdit ? { owner: userId, includeHidden: true } : {})
  return (
    <main id="main-content" tabIndex={-1}>
      <UsesClient categories={categories} items={items} canEdit={canEdit} />
    </main>
  )
}
