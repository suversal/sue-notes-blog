import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../lib/payload';
import { getSiteProfile } from '../../lib/blog-data';
import { AdminShell } from './components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const owner = String(auth.user.id);
  const [site, articles] = await Promise.all([getSiteProfile(owner), payload.count({ collection: 'articles', overrideAccess: true, where: { owner: { equals: owner } } })]);
  return <AdminShell siteName={site.siteName} authorName={site.authorName} articleCount={articles.totalDocs}>{children}</AdminShell>;
}
