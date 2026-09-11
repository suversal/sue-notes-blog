import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPost, getPublicPosts, getSiteProfile } from '../../../lib/blog-data';
import { ArticleReader } from '../components/article-reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublicPost((await params).slug); if (!post) notFound();
  const title = `${post.title} · 苏码手记`; return { title, description: post.excerpt, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { title, description: post.excerpt, type: 'article', url: `/blog/${post.slug}`, publishedTime: post.publishedAt }, robots: { index: true, follow: true } };
}

export default async function PublicArticle({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug; const [post, posts, site] = await Promise.all([getPublicPost(slug), getPublicPosts(), getSiteProfile()]); if (!post) notFound(); const nextPost = posts.find((item) => item.id !== post.id);
  return <main id="main-content" tabIndex={-1}><ArticleReader post={post} site={site} {...(nextPost ? { nextPost } : {})} /></main>;
}
