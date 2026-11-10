import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payload, PayloadRequest } from 'payload';
import { readObsidianFiles } from '../../src/lib/obsidian-import';

const { createDraft } = vi.hoisted(() => ({ createDraft: vi.fn() }));
vi.mock('../../src/lib/article-service', () => ({ createDraft }));
import { importObsidianArticle } from '../../src/lib/obsidian-import-service';

const videoPath = 'assets/Recording_2026_11_9_21_48_07 1.mp4';
const videoSource = 'assets/Recording_2026_11_9_21_48_07%201.mp4';
const mp4 = Buffer.from('000000186674797069736f6d0000020069736f6d6d703432', 'hex');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const req = {} as PayloadRequest;

function client() {
  const find = vi.fn().mockResolvedValue({ docs: [] });
  const create = vi.fn().mockImplementation(async ({ data, file }) => ({ ...data, id: file.mimetype === 'video/mp4' ? 'video-id' : 'image-id' }));
  return { find, create, payload: { find, create } as unknown as Payload };
}

describe('Obsidian video import', () => {
  beforeEach(() => { vi.clearAllMocks(); createDraft.mockResolvedValue({ id: 'draft-id' }); });

  it('archives mixed attachments once and keeps repeated videos at their original positions', async () => {
    const { payload, create } = client();
    const markdown = `# 测试文章\n\n![](assets/image.png)\n\n视频前\n\n![](${videoSource})\n\n视频后\n\n![](${videoSource})`;
    const files = readObsidianFiles({ path: '测试.md', data: Buffer.from(markdown) }, [
      { path: 'assets/image.png', data: png }, { path: videoPath, data: mp4 },
    ]);
    const result = await importObsidianArticle({ files, owner: 'owner-id', payload, req });
    expect(result).toMatchObject({ articleId: 'draft-id', imageCount: 1, videoCount: 2, uploadedCount: 2 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ file: expect.objectContaining({ name: 'Recording_2026_11_9_21_48_07 1.mp4', mimetype: 'video/mp4' }) }));
    const content = createDraft.mock.calls[0]![1].content;
    expect(content.root.children.map((node: { type: string }) => node.type)).toEqual(['upload', 'paragraph', 'article-video', 'paragraph', 'article-video']);
    expect(content.root.children[2].fields.media).toBe('video-id');
    expect(content.root.children[4].fields.media).toBe('video-id');
  });

  it('reuses an existing MP4 and still creates a playable video node', async () => {
    const { payload, find, create } = client();
    find.mockResolvedValue({ docs: [{ id: 'reused-video', owner: 'owner-id', mimeType: 'video/mp4', alt: '录屏' }] });
    const files = readObsidianFiles({ path: '测试.md', data: Buffer.from(`# 视频\n\n![](${videoSource})`) }, [{ path: videoPath, data: mp4 }]);
    const result = await importObsidianArticle({ files, owner: 'owner-id', payload, req });
    expect(result).toMatchObject({ imageCount: 0, videoCount: 1, reusedCount: 1, uploadedCount: 0 });
    expect(create).not.toHaveBeenCalled();
    expect(createDraft.mock.calls[0]![1].content.root.children[0]).toMatchObject({ type: 'article-video', fields: { media: 'reused-video' } });
  });

  it.each(['missing', 'invalid'])('rejects a %s video before uploading any earlier image or saving a draft', async (failure) => {
    const { payload, create, find } = client();
    const files = readObsidianFiles({ path: '测试.md', data: Buffer.from(`# 视频\n\n![](assets/image.png)\n\n![](${videoSource})`) }, [
      { path: 'assets/image.png', data: png },
      ...(failure === 'invalid' ? [{ path: videoPath, data: png }] : []),
    ]);
    await expect(importObsidianArticle({ files, owner: 'owner-id', payload, req })).rejects.toThrow(failure === 'missing' ? '找不到正文引用的附件' : 'MP4 视频');
    expect(create).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
    expect(createDraft).not.toHaveBeenCalled();
  });
});
