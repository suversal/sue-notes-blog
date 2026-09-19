import { createHash, randomBytes } from 'node:crypto';
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload';
import { markdownToArticleContent } from './article-content';
import { articleContentHasMeaningfulContent, linkifyArticleContentUrls, type ArticleContent } from './article-content-data';
import { getPayloadClient } from './payload';

export const revisionHash = (value: object) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

type DraftMeta = {
  title: string;
  slug: string;
  excerpt?: string;
  tags?: string[];
  topic?: string;
  coverImage?: string;
  coverStyle?: 'none' | 'notes' | 'grid' | 'cache';
  publicReferences?: { label: string; url: string }[];
};

export type DraftInput = DraftMeta & (
  | { content: ArticleContent; bodyMarkdown?: never }
  | { bodyMarkdown: string; content?: never }
);

type ResolvedDraftInput = DraftMeta & { content: ArticleContent };

const reservedSlugs = new Set(['about', 'api', 'articles', 'library', 'login', 'setup', 'admin', '_next']);
const autoSlugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateArticleSlug() {
  const bytes = randomBytes(10);
  return Array.from(bytes, (byte) => autoSlugAlphabet[byte % autoSlugAlphabet.length]).join('');
}

export class ArticleSlugUnavailableError extends Error {
  readonly code = 'ARTICLE_SLUG_UNAVAILABLE';

  constructor() {
    super('文章链接已被使用或不可用。');
    this.name = 'ArticleSlugUnavailableError';
  }
}

export function parseArticlePinPriority(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,3}$/.test(raw)) throw new Error('置顶优先级必须是 0–999 的整数。');
  const priority = Number(raw);
  if (!Number.isSafeInteger(priority) || priority < 0 || priority > 999) throw new Error('置顶优先级必须是 0–999 的整数。');
  return priority;
}

function relationId(value: unknown): string { return value && typeof value === 'object' && 'id' in value ? String((value as { id: unknown }).id) : String(value); }
function normalizeTags(tags?: string[]) { return (tags ?? []).map((value) => value.trim()).filter(Boolean).slice(0, 20); }
function assertSlug(slug: string) { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || reservedSlugs.has(slug)) throw new ArticleSlugUnavailableError(); }

async function assertSlugAvailable(payload: any, owner: string, slug: string, excludeArticleId?: string) {
  const result = await payload.find({
    collection: 'articles',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { owner: { equals: owner } },
        { slug: { equals: slug } },
        ...(excludeArticleId ? [{ id: { not_equals: excludeArticleId } }] : []),
      ],
    },
  });
  if (result.docs.length > 0) throw new ArticleSlugUnavailableError();
}

async function resolveDraftInput(payload: any, input: DraftInput, owner: string): Promise<ResolvedDraftInput> {
  if (input.coverImage) {
    const media = await payload.findByID({ collection: 'media', id: input.coverImage, overrideAccess: true, depth: 0 });
    if (relationId(media.owner) !== owner || !media.mimeType?.startsWith('image/')) throw new Error('封面图片不可用。');
  }
  const content = linkifyArticleContentUrls(input.content ?? markdownToArticleContent(payload, input.bodyMarkdown));
  if (!articleContentHasMeaningfulContent(content)) throw new Error('正文不能为空。');
  const { bodyMarkdown: _, ...rest } = input;
  return { ...rest, content };
}

function revisionData(input: ResolvedDraftInput) {
  const tags = normalizeTags(input.tags);
  const body = { title: input.title, slug: input.slug, content: input.content, excerpt: input.excerpt ?? '', tags, topic: input.topic || null, coverStyle: input.coverStyle ?? 'none', coverImage: input.coverImage || null, publicReferences: input.publicReferences ?? [] };
  return { ...body, tags: tags.map((value) => ({ value })), revisionHash: revisionHash(body) };
}

async function appendRevision(payload: any, owner: string, article: any, input: DraftInput) {
  const resolved = await resolveDraftInput(payload, input, owner); const data = revisionData(resolved);
  const previous = await payload.find({ collection: 'article-revisions', overrideAccess: true, limit: 1, sort: '-revisionNumber', where: { article: { equals: article.id } } });
  const revision = await payload.create({ collection: 'article-revisions', overrideAccess: true, data: { article: article.id, owner, revisionNumber: (previous.docs[0]?.revisionNumber ?? 0) + 1, ...data } });
  return { revision, data };
}

async function currentRevision(payload: any, owner: string, article: any) {
  if (article.currentRevision) return payload.findByID({ collection: 'article-revisions', id: relationId(article.currentRevision), overrideAccess: true, depth: 0 });
  return (await appendRevision(payload, owner, article, { title: article.title, slug: article.slug, content: article.content, ...(article.excerpt ? { excerpt: article.excerpt } : {}), tags: (article.tags ?? []).map((tag: any) => tag.value), ...(article.topic ? { topic: relationId(article.topic) } : {}), coverStyle: article.coverStyle ?? 'none', coverImage: article.coverImage ? relationId(article.coverImage) : '', publicReferences: article.publicReferences ?? [] })).revision;
}

async function ownedArticle(payload: any, owner: string, articleId: string) {
  const article = await payload.findByID({ collection: 'articles', id: articleId, overrideAccess: true, depth: 0 }) as any;
  if (relationId(article.owner) !== owner || article.status === 'archived') throw new Error('文章不存在。');
  return article;
}

export async function createDraft(owner: string, input: DraftInput) {
  input = { ...input, slug: input.slug.trim().toLowerCase() || generateArticleSlug() };
  assertSlug(input.slug); const payload = await getPayloadClient(); await assertSlugAvailable(payload, owner, input.slug); const resolved = await resolveDraftInput(payload, input, owner); const data = revisionData(resolved);
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    const article = await payload.create({ collection: 'articles', overrideAccess: true, req, data: { owner, title: resolved.title, slug: resolved.slug, content: resolved.content, excerpt: resolved.excerpt, tags: data.tags, topic: resolved.topic, coverStyle: data.coverStyle, coverImage: data.coverImage, publicReferences: resolved.publicReferences, revisionHash: data.revisionHash, visibility: 'private', status: 'draft' } } as any);
    const revision = await payload.create({ collection: 'article-revisions', overrideAccess: true, req, data: { article: article.id, owner, revisionNumber: 1, ...data } });
    const updated = await payload.update({ collection: 'articles', id: article.id, overrideAccess: true, req, data: { currentRevision: revision.id } });
    await commitTransaction(req);
    return updated;
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

/** 新版本只更新私有工作副本；已公开版本继续由 publishedRevision 提供。 */
export async function updateDraft(owner: string, articleId: string, input: DraftInput) {
  const payload = await getPayloadClient(); const article = await ownedArticle(payload, owner, articleId);
  input = { ...input, slug: input.slug.trim().toLowerCase() || article.slug || generateArticleSlug() };
  assertSlug(input.slug); await assertSlugAvailable(payload, owner, input.slug, articleId);
  const { revision, data } = await appendRevision(payload, owner, article, input);
  return payload.update({ collection: 'articles', id: articleId, overrideAccess: true, data: { title: data.title, slug: data.slug, content: data.content, excerpt: data.excerpt, tags: data.tags, topic: data.topic, coverStyle: data.coverStyle, coverImage: data.coverImage, publicReferences: data.publicReferences, revisionHash: data.revisionHash, currentRevision: revision.id } } as any);
}

export async function previewDraft(owner: string, articleId: string) {
  const payload = await getPayloadClient(); const article = await ownedArticle(payload, owner, articleId); const revision = await currentRevision(payload, owner, article); const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const approval = await payload.create({ collection: 'publish-approvals', overrideAccess: true, data: { article: articleId, revision: revision.id, revisionHash: revision.revisionHash, expiresAt } });
  return { article, revision, approvalId: String(approval.id), expiresAt };
}

export async function publishDraft(owner: string, articleId: string, approvalId: string) {
  const payload = await getPayloadClient(); const article = await ownedArticle(payload, owner, articleId); const approval = await payload.findByID({ collection: 'publish-approvals', id: approvalId, overrideAccess: true, depth: 0 }) as any; const revision = await currentRevision(payload, owner, article);
  const approvalMatches = relationId(approval.article) === articleId && relationId(approval.revision) === String(revision.id) && approval.revisionHash === revision.revisionHash;
  if (approval.usedAt) {
    if (approvalMatches && relationId(article.publishedRevision) === String(revision.id) && article.status === 'published' && article.visibility === 'public') return article;
    throw new Error('发布批准无效或已过期。');
  }
  if (!approvalMatches || new Date(approval.expiresAt) < new Date()) throw new Error('发布批准无效或已过期。');
  await payload.update({ collection: 'publish-approvals', id: approvalId, overrideAccess: true, data: { usedAt: new Date().toISOString() } });
  return payload.update({ collection: 'articles', id: articleId, overrideAccess: true, data: { status: 'published', visibility: 'public', publishedAt: new Date().toISOString(), publishedSlug: revision.slug, publishedRevision: revision.id } });
}

export async function makePrivate(owner: string, articleId: string) {
  const payload = await getPayloadClient(); const article = await ownedArticle(payload, owner, articleId);
  if (article.status !== 'published') throw new Error('公开文章不存在。');
  return payload.update({ collection: 'articles', id: articleId, overrideAccess: true, data: { status: 'draft', visibility: 'private', privateAt: new Date().toISOString() } });
}

export async function setArticlePinPriority(owner: string, articleId: string, pinPriority: number) {
  const payload = await getPayloadClient(); const article = await ownedArticle(payload, owner, articleId);
  if (article.status !== 'published' && pinPriority > 0) throw new Error('只有已发布文章可以置顶。');
  return payload.update({ collection: 'articles', id: articleId, overrideAccess: true, data: { pinPriority: pinPriority || null } });
}

export async function archiveArticle(owner: string, articleId: string) {
  const payload = await getPayloadClient(); await ownedArticle(payload, owner, articleId);
  return payload.update({ collection: 'articles', id: articleId, overrideAccess: true, data: { status: 'archived', visibility: 'private', privateAt: new Date().toISOString() } });
}
