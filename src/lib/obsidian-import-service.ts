import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Payload, PayloadRequest } from 'payload';
import { rewriteMarkdownImages } from './article-import';
import { createDraft } from './article-service';
import { markdownToArticleContentStable } from './markdown-to-article-content';
import { detectImageMimeType } from './remote-image';
import { extractObsidianDocument, readObsidianArchive, resolveObsidianAssetPath, type ObsidianArchive } from './obsidian-import';

function relationId(value: unknown) {
  return value && typeof value === 'object' && 'id' in value
    ? String((value as { id: unknown }).id)
    : String(value);
}

export async function importObsidianArticle({
  archive,
  files,
  owner,
  payload,
  req,
}: {
  archive?: Buffer;
  files?: ObsidianArchive;
  owner: string;
  payload: Payload;
  req: PayloadRequest;
}) {
  if (!archive && !files) throw new Error('没有读取到 Obsidian 文章。');
  const unpacked = files ?? await readObsidianArchive(archive!);
  const document = extractObsidianDocument(unpacked.markdown, unpacked.markdownPath);
  let uploadedCount = 0;
  let reusedCount = 0;

  const rewritten = await rewriteMarkdownImages(document.bodyMarkdown, async ({ alt, source }) => {
    const assetPath = resolveObsidianAssetPath(unpacked.markdownPath, source);
    const data = unpacked.files.get(assetPath);
    if (!data) throw new Error(`找不到正文引用的图片：${assetPath}`);
    const mimeType = detectImageMimeType(data);
    if (!mimeType) throw new Error(`图片格式不受支持或内容已损坏：${assetPath}`);
    const sha256 = createHash('sha256').update(data).digest('hex');
    const existing = await payload.find({
      collection: 'media',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { and: [{ owner: { equals: owner } }, { sha256: { equals: sha256 } }] },
    });
    const reused = existing.docs.find((media) => relationId(media.owner) === owner && media.mimeType?.startsWith('image/'));
    if (reused) {
      reusedCount += 1;
      return { id: String(reused.id), alt: reused.alt };
    }

    const media = await payload.create({
      collection: 'media',
      req,
      data: {
        owner,
        alt: alt.trim().slice(0, 240) || path.posix.basename(assetPath),
        provider: 'imgbed',
        storageKey: 'pending',
        sha256: 'pending',
        uploadedAt: new Date().toISOString(),
      },
      file: {
        data,
        mimetype: mimeType,
        name: path.posix.basename(assetPath),
        size: data.length,
      },
    });
    uploadedCount += 1;
    return { id: String(media.id), alt: media.alt };
  });

  const article = await createDraft(owner, {
    title: document.title,
    slug: '',
    content: markdownToArticleContentStable(rewritten.markdown),
  });
  return {
    articleId: String(article.id),
    imageCount: rewritten.imageCount,
    reusedCount,
    title: document.title,
    uploadedCount,
  };
}
