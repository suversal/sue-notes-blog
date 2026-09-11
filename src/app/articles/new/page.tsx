import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../lib/payload';
import { listTopics } from '../../../lib/blog-admin-service';
import { Icon } from '../../blog/components/ui-icon';
import styles from '../admin-v1.module.css';
import { NewArticleForm } from './new-article-form';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const payload = await getPayloadClient(); const auth = await payload.auth({ headers: await headers(), canSetHeaders: false }); if (!auth.user) redirect('/login'); const topics = await listTopics(String(auth.user.id)); const { error } = await searchParams;
  const topicRows = (topics.docs as any[]).map((topic) => ({ id: String(topic.id), name: String(topic.name) }));
  return <main id="main-content" tabIndex={-1}><div className={styles.editorHeader}><Link href="/articles"><Icon name="back" />文章</Link><span>新草稿</span></div>{error && <p className={styles.error} role="alert">{error === 'slug' ? '文章链接已被使用或不可用，请换一个。' : '请填写标题、有效链接和正文。'}</p>}<NewArticleForm topics={topicRows} /></main>;
}
