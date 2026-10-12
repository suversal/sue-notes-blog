import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getPayloadClient } from '../../../../lib/payload';
import { listTopics } from '../../../../lib/blog-admin-service';
import { publicCoverImage, relationId } from '../../../../lib/blog-data';
import { preparePublishForEditor, saveDraftFromWeb } from '../actions';
import { EditorForm } from './editor-form';
import styles from '../admin-v1.module.css';
import { normalizeArticleContentForEditor } from '../../../../lib/article-content-data';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const owner = String(auth.user.id); const id = (await params).id; const article = await payload.findByID({ collection: 'articles', id, overrideAccess: true, depth: 1 }).catch(() => undefined) as any; if (!article || relationId(article.owner) !== owner || article.status === 'archived') notFound();
  const topics = await listTopics(owner); const topicRows = (topics.docs as any[]).map((topic) => ({ id: String(topic.id), name: topic.name })); const { error, notice } = await searchParams;
  return <main id="main-content" tabIndex={-1}>{error && <p className={styles.error} role="alert">保存失败，请检查字段后重试。</p>}{notice && <p className={styles.success} role="status">{notice === 'created' ? '草稿已创建。' : '已保存为新版本。'}</p>}<EditorForm articleId={String(article.id)} status={article.status} save={saveDraftFromWeb} preparePreview={preparePublishForEditor} initial={{ title: article.title, slug: article.slug, excerpt: article.excerpt ?? '', content: normalizeArticleContentForEditor(article.content), topicId: relationId(article.topic) || topicRows[0]?.id || '', coverStyle: article.coverStyle || 'none', coverImage: publicCoverImage(article.coverImage), publicReferences: article.publicReferences ?? [] }} topics={topicRows} /></main>;
}
