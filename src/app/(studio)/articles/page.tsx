import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../lib/payload';
import { listTopics } from '../../../lib/blog-admin-service';
import { relationId } from '../../../lib/blog-data';
import { articleContentPlainText } from '../../../lib/article-content-data';
import { ArticleManager, type ManagedArticle } from './components/article-manager';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ count?: string; error?: string; notice?: string; topic?: string }> }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const owner = String(auth.user.id);
  const [result, topicResult] = await Promise.all([payload.find({ collection: 'articles', overrideAccess: true, depth: 1, limit: 100, sort: '-updatedAt', where: { and: [{ owner: { equals: owner } }, { status: { not_equals: 'archived' } }] } }), listTopics(owner)]);
  const topics = (topicResult.docs as any[]).map((topic) => ({ id: String(topic.id), name: String(topic.name) })); const topicMap = new Map(topics.map((topic) => [topic.id, topic.name]));
  const articles = (result.docs as any[]).map((article): ManagedArticle => { const topicId = relationId(article.topic) || 'uncategorized'; const current = relationId(article.currentRevision); const published = relationId(article.publishedRevision); return { id: String(article.id), title: article.title, slug: article.slug, ...(article.publishedSlug ? { publishedSlug: article.publishedSlug } : {}), topicId, topicName: article.topic && typeof article.topic === 'object' ? String(article.topic.name || '未分类') : topicMap.get(topicId) || article.tags?.[0]?.value || '未分类', status: article.status, hasUnpublishedChanges: article.status === 'published' && Boolean(current && published && current !== published), pinPriority: Number(article.pinPriority) || 0, sourceUrl: article.sourceUrl || '', ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}), updatedAt: article.updatedAt, characterCount: articleContentPlainText(article.content).length }; }); const { count, error, notice, topic } = await searchParams; const importedCount = Math.max(0, Number.parseInt(count ?? '', 10) || 0);
  return <main id="main-content" tabIndex={-1}>{error === 'pin' && <p role="alert">置顶优先级保存失败，请输入 0–999 的整数，并确认文章已经发布。</p>}{error === 'source' && <p role="alert">X 原文链接保存失败，请填写 x.com 或 twitter.com 上的完整链接。</p>}{notice && <p role="status">{notice === 'private' ? '文章已撤回为草稿。' : notice === 'archived' ? '文章已归档。' : notice === 'imported' ? `已导入 ${importedCount} 篇文章，均已保存为私密草稿。` : notice === 'pin-updated' ? '文章置顶优先级已更新。' : notice === 'source-updated' ? 'X 原文链接已更新。' : notice}</p>}<ArticleManager articles={articles} topics={topics} initialTopic={topic && topics.some((item) => item.id === topic) ? topic : 'all'} /></main>;
}
