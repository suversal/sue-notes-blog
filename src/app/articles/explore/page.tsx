import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { listExploreItems } from '../../../lib/explore-service'
import { getPayloadClient } from '../../../lib/payload'
import { ExploreManager } from '../components/explore-manager'

export const dynamic = 'force-dynamic'

export default async function ExploreAdminPage() {
  const payload = await getPayloadClient()
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  if (!auth.user) redirect('/login')
  const items = await listExploreItems({ owner: String(auth.user.id), includeHidden: true })
  return (
    <main id="main-content" tabIndex={-1}>
      <ExploreManager items={items} />
    </main>
  )
}
