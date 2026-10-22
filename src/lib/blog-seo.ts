import type { Metadata } from 'next';
import type { PublicPost, SiteProfile } from './blog-data';
import { articleContentPlainText } from './article-content-data';
import { getSiteOrigin } from './env';

/** 只使用已发布正文补足搜索摘要，不把自动摘要写回编辑器或数据库。 */
export function articleDescription(post: Pick<PublicPost, 'title' | 'excerpt' | 'content'>): string {
  const prose = {
    ...post.content,
    root: {
      ...post.content.root,
      children: post.content.root.children.filter((node) => node.type === 'paragraph' || node.type === 'quote'),
    },
  };
  const text = (post.excerpt.trim() || articleContentPlainText(prose).trim() || post.title).replace(/\s+/gu, ' ').trim();
  const characters = Array.from(text);
  return characters.length > 160 ? `${characters.slice(0, 159).join('').trimEnd()}…` : text;
}

export function publicPageMetadata({ title, description, path, siteName = '苏码玩家', image }: {
  title: string;
  description: string;
  path: string;
  siteName?: string;
  image?: { url: string; alt: string };
}): Metadata {
  const url = new URL(path, getSiteOrigin()).href;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      title, description, url, siteName, locale: 'zh_CN', type: 'website',
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title, description, creator: '@suversal',
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function articleMetadata(post: PublicPost, site: SiteProfile): Metadata {
  const metadata = publicPageMetadata({
    title: `${post.title} · ${site.siteName}`,
    description: articleDescription(post),
    path: `/blog/${encodeURIComponent(post.slug)}`,
    siteName: site.siteName,
    image: post.coverImage,
  });
  return {
    ...metadata,
    authors: [{ name: site.authorName, url: new URL('/blog/about', getSiteOrigin()).href }],
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [new URL('/blog/about', getSiteOrigin()).href],
      section: post.topic.name,
    },
  };
}

export function articleJsonLd(post: PublicPost, site: SiteProfile) {
  const origin = getSiteOrigin();
  const url = new URL(`/blog/${encodeURIComponent(post.slug)}`, origin).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: articleDescription(post),
    inLanguage: 'zh-CN',
    articleSection: post.topic.name,
    datePublished: post.publishedAt,
    // updatedAt 包含私有草稿、置顶等改动，不用它伪造公开文章的修改日期。
    author: { '@type': 'Person', name: site.authorName, url: new URL('/blog/about', origin).href },
    isPartOf: { '@type': 'Blog', name: site.siteName, url: new URL('/blog', origin).href },
    ...(post.coverImage ? { image: [post.coverImage.url] } : {}),
  };
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
