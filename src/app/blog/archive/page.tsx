import type { Metadata } from 'next';
import { getPublicPosts } from '../../../lib/blog-data';
import { ArchiveClient } from '../components/archive-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '归档 · 苏码玩家', description: '按时间和主题查找公开文章。', alternates: { canonical: '/blog/archive' }, robots: { index: true, follow: true } };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) { const { topic } = await searchParams; return <main id="main-content" tabIndex={-1}><ArchiveClient posts={await getPublicPosts()} initialTopic={topic ?? 'all'} /></main>; }
