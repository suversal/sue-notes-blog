import type { Where } from 'payload';
import { cache } from 'react';
import { getPayloadClient } from './payload';
import { articleContentPlainText, type ArticleContent } from './article-content-data';
import { readingMinutes } from './blog-shared';

export type SiteProfile = { siteName: string; authorName: string; tagline: string; authorBio: string };
export type PublicPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: ArticleContent;
  readingMinutes: number;
  topic: { id: string; name: string };
  coverImage?: { id: string; url: string; alt: string };
  coverStyle: 'none' | 'notes' | 'grid' | 'cache';
  pinPriority: number;
  sourceUrl?: string;
  publishedAt: string;
  updatedAt: string;
  publicReferences: { label: string; url: string }[];
};

/** 列表、搜索、上一篇/下一篇只需要这些；正文只随文章页本身下发，不进其他页面的 HTML。 */
export type PublicPostSummary = Omit<PublicPost, 'content' | 'publicReferences'>;

export function comparePublicPostPriority(
  a: Pick<PublicPost, 'pinPriority' | 'publishedAt'>,
  b: Pick<PublicPost, 'pinPriority' | 'publishedAt'>,
) {
  const aPinned = a.pinPriority > 0;
  const bPinned = b.pinPriority > 0;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return (aPinned ? a.pinPriority - b.pinPriority : 0) || b.publishedAt.localeCompare(a.publishedAt);
}

export function publicCoverImage(value: unknown): PublicPost['coverImage'] {
  if (!value || typeof value !== 'object' || !('url' in value) || typeof value.url !== 'string' || !/^https?:\/\//.test(value.url)) return undefined;
  const media = value as { id: string; url: string; alt?: string };
  return { id: String(media.id), url: media.url, alt: media.alt || '文章封面' };
}

export const defaultSiteProfile: SiteProfile = {
  siteName: '苏码玩家',
  authorName: 'Sue',
  tagline: '一个程序员的折腾记录：Apple 生态、家庭网络、出海基建，还有 AI。',
  authorBio: '我喜欢折腾。遇到感兴趣的东西，就自己动手试一遍，试明白了再写下来。',
};

export function relationId(value: unknown): string {
  return value && typeof value === 'object' && 'id' in value ? String((value as { id: unknown }).id) : String(value ?? '');
}

function topicFrom(revision: any, article: any, topicNames: Map<string, string>): PublicPost['topic'] {
  const raw = revision.topic ?? article.topic;
  if (raw && typeof raw === 'object') return { id: String(raw.id), name: String(raw.name || '未分类') };
  const legacy = revision.tags?.[0]?.value ?? article.tags?.[0]?.value;
  const id = raw ? String(raw) : 'uncategorized';
  return { id, name: topicNames.get(id) || legacy || '未分类' };
}

export const getSiteProfile = cache(async (owner?: string): Promise<SiteProfile> => {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: 'site-settings', overrideAccess: true, depth: 0, limit: 1, ...(owner ? { where: { owner: { equals: owner } } } : {}) } as any);
  const item = result.docs[0] as any;
  return item ? { siteName: item.siteName, authorName: item.authorName, tagline: item.tagline, authorBio: item.authorBio } : defaultSiteProfile;
});

const publicArticleFilters: Where[] = [{ status: { equals: 'published' } }, { visibility: { equals: 'public' } }];

/** 站点地图只读取公开地址与发布时间，不加载私有工作副本正文，也不受列表的 100 篇上限影响。 */
export async function getPublicSitemapPosts(): Promise<{ slug: string; publishedAt?: string }[]> {
  const payload = await getPayloadClient();
  const articles = await payload.find({
    collection: 'articles', overrideAccess: true, depth: 0, pagination: false,
    select: { publishedSlug: true, publishedAt: true },
    where: { and: [...publicArticleFilters, { publishedRevision: { exists: true } }, { publishedSlug: { exists: true } }] },
  });
  return articles.docs.flatMap((article) => article.publishedSlug
    ? [{ slug: article.publishedSlug, ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}) }]
    : []);
}

/** 一次查询取回这些文章的已发布修订，避免每篇文章单独查一次。 */
async function loadPublicPosts(payload: Awaited<ReturnType<typeof getPayloadClient>>, articles: any[]): Promise<PublicPost[]> {
  const published = articles.filter((article) => article.publishedRevision);
  if (!published.length) return [];
  const [revisions, topics] = await Promise.all([
    payload.find({ collection: 'article-revisions', overrideAccess: true, depth: 1, pagination: false, where: { id: { in: published.map((article) => relationId(article.publishedRevision)) } } }),
    payload.find({ collection: 'topics', overrideAccess: true, depth: 0, limit: 100 }),
  ]);
  const revisionsById = new Map((revisions.docs as any[]).map((revision) => [String(revision.id), revision]));
  const topicNames = new Map((topics.docs as any[]).map((topic) => [String(topic.id), String(topic.name)]));
  return published.flatMap((article) => {
    const revision = revisionsById.get(relationId(article.publishedRevision));
    if (!revision) return [];
    return [{
      id: String(article.id), title: revision.title, slug: revision.slug,
      excerpt: revision.excerpt?.trim() || '', content: revision.content, readingMinutes: readingMinutes(articleContentPlainText(revision.content)),
      topic: topicFrom(revision, article, topicNames), coverStyle: revision.coverStyle || 'none', coverImage: publicCoverImage(revision.coverImage),
      pinPriority: Number(article.pinPriority) || 0,
      ...(article.sourceUrl ? { sourceUrl: String(article.sourceUrl) } : {}),
      publishedAt: article.publishedAt || article.updatedAt, updatedAt: article.updatedAt,
      publicReferences: revision.publicReferences ?? [],
    } satisfies PublicPost];
  });
}

// cache：同一次请求里（页面元数据和正文各取一次）只查一遍数据库。
export const getPublicPosts = cache(async (limit = 100, order: 'latest' | 'pinned' = 'latest'): Promise<PublicPostSummary[]> => {
  const payload = await getPayloadClient();
  const articles = await payload.find({ collection: 'articles', overrideAccess: true, depth: 1, limit, sort: order === 'pinned' ? ['pinPriority', '-publishedAt'] : '-publishedAt', where: { and: publicArticleFilters } });
  const posts = (await loadPublicPosts(payload, articles.docs)).map(({ content: _content, publicReferences: _references, ...summary }): PublicPostSummary => summary);
  return order === 'pinned' ? posts.sort(comparePublicPostPriority) : posts;
});

export const getPublicPost = cache(async (slug: string): Promise<PublicPost | undefined> => {
  const payload = await getPayloadClient();
  const articles = await payload.find({ collection: 'articles', overrideAccess: true, depth: 1, limit: 1, where: { and: [...publicArticleFilters, { publishedSlug: { equals: slug } }] } });
  return (await loadPublicPosts(payload, articles.docs))[0];
});
