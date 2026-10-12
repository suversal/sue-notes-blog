import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../../lib/payload';
import { listTopics } from '../../../../lib/blog-admin-service';
import { relationId } from '../../../../lib/blog-data';
import { TopicManager } from '../components/topic-manager';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const owner = String(auth.user.id); const [topics, articles] = await Promise.all([listTopics(owner), payload.find({ collection: 'articles', overrideAccess: true, depth: 0, limit: 500, where: { and: [{ owner: { equals: owner } }, { status: { not_equals: 'archived' } }] } })]);
  const rows = (topics.docs as any[]).map((topic) => { const related = (articles.docs as any[]).filter((article) => relationId(article.topic) === String(topic.id)); return { id: String(topic.id), name: topic.name, isSystem: Boolean(topic.isSystem), publicCount: related.filter((article) => article.status === 'published').length, draftCount: related.filter((article) => article.status === 'draft' || article.status === 'published' && relationId(article.currentRevision) !== relationId(article.publishedRevision)).length }; });
  return <main id="main-content" tabIndex={-1}><TopicManager topics={rows} /></main>;
}
