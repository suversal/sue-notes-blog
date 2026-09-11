import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

process.env.DATABASE_URL ??= 'postgres://postgres:postgres@127.0.0.1:55433/sue_notes_blog';
process.env.PAYLOAD_SECRET ??= 'development-only-payload-secret-that-is-long-enough';

const [{ createDraft, updateDraft, previewDraft, publishDraft, makePrivate }, { getPublicPost }, { getPayloadClient }, { articleContentPlainText }] = await Promise.all([
  import('../src/lib/article-service.js'),
  import('../src/lib/blog-data.js'),
  import('../src/lib/payload.js'),
  import('../src/lib/article-content-data.js'),
]);

const suffix = randomUUID();
const payload = await getPayloadClient();
let userId: string | undefined;
let articleId: string | undefined;

try {
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: `blog-${suffix}@example.test`,
      password: `Blog-${suffix}-only`,
      displayName: 'Blog smoke',
    },
  });
  userId = String(user.id);

  const article = await createDraft(userId, {
    title: '博客发布冒烟测试',
    slug: `blog-${suffix}`,
    bodyMarkdown: '# 初稿\n\n这是尚未公开的正文。',
    excerpt: '仅用于自动验证。',
  });
  articleId = String(article.id);
  assert.equal(await getPublicPost(article.slug), undefined);

  const staleApproval = await previewDraft(userId, articleId);
  await updateDraft(userId, articleId, {
    title: '博客发布冒烟测试',
    slug: article.slug,
    bodyMarkdown: '# 正式版本\n\n这是已经确认发布的正文。',
    excerpt: '仅用于自动验证。',
  });
  await assert.rejects(() => publishDraft(userId!, articleId!, staleApproval.approvalId));

  const approval = await previewDraft(userId, articleId);
  const published = await publishDraft(userId, articleId, approval.approvalId);
  assert.equal(published.status, 'published');
  const publicPost = await getPublicPost(article.slug);
  assert(publicPost);
  assert.equal(articleContentPlainText(publicPost.content), '正式版本\n这是已经确认发布的正文。');

  await makePrivate(userId, articleId);
  assert.equal(await getPublicPost(article.slug), undefined);

  console.info('Blog smoke passed: 草稿私有 → 旧批准失效 → 预览批准 → 发布 → 转私密。');
} finally {
  if (articleId) {
    await payload.update({
      collection: 'articles',
      id: articleId,
      overrideAccess: true,
      data: { currentRevision: null, publishedRevision: null },
    });
    await payload.delete({
      collection: 'publish-approvals',
      overrideAccess: true,
      where: { article: { equals: articleId } },
    });
    await payload.delete({
      collection: 'article-revisions',
      overrideAccess: true,
      where: { article: { equals: articleId } },
    });
    await payload.delete({ collection: 'articles', id: articleId, overrideAccess: true });
  }
  if (userId) await payload.delete({ collection: 'users', id: userId, overrideAccess: true });
  await payload.db.destroy?.();
}

process.exit(0);
