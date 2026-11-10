import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isMP4, MAX_VIDEO_SIZE, videoFileError } from '../../src/lib/video-file';
import { articleContentHasMeaningfulContent, normalizeArticleContentForEditor, type ArticleContent } from '../../src/lib/article-content-data';
import { articleContentToMarkdown } from '../../src/lib/article-content-markdown';
import { createEditor } from 'lexical';
import { VideoServerNode } from '../../src/lexical/video-node';

const { auth, create, createLocalReq } = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), createLocalReq: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../src/lib/payload', () => ({ getPayloadClient: async () => ({ auth, create, logger: { error: vi.fn() } }) }));
vi.mock('payload', () => ({ createLocalReq }));
import { POST } from '../../src/app/api/editor/videos/route';

const mp4 = Buffer.from('000000186674797069736f6d0000020069736f6d6d703432', 'hex');
const media = { id: 'video-id', alt: '演示视频', mimeType: 'video/mp4', url: 'https://img.suversal.com/file/demo.mp4', filename: 'demo.mp4' };
const content = { root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [{ type: 'article-video', version: 1, id: 'video-node', format: '', fields: { media } }] } } as unknown as ArticleContent;

describe('MP4 upload validation', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ user: { id: 'owner-id' } }); create.mockResolvedValue(media); createLocalReq.mockResolvedValue({ user: { id: 'owner-id' } }); });
  const request = (data: Buffer = mp4, type = 'video/mp4') => {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(data)], { type }), 'demo.mp4');
    return new Request('http://localhost/api/editor/videos', { method: 'POST', body: form });
  };

  it('rejects renamed images and non-MP4 brands, and bounds file size', () => {
    expect(isMP4(mp4)).toBe(true);
    expect(isMP4(Buffer.from('<html>not a video</html>'))).toBe(false);
    expect(isMP4(Buffer.from('00000018667479706176696600000000617669666d696631', 'hex'))).toBe(false);
    expect(videoFileError({ name: 'demo.mp4', type: '', size: MAX_VIDEO_SIZE })).toBeUndefined();
    expect(videoFileError({ name: 'demo.mp4', type: 'video/mp4', size: MAX_VIDEO_SIZE + 1 })).toContain('50 MB');
    expect(videoFileError({ name: 'demo.mov', type: 'video/quicktime', size: 10 })).toContain('MP4');
  });
  it('requires authentication before reading or saving files', async () => {
    auth.mockResolvedValue({ user: null });
    expect((await POST(request())).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects spoofed content before it reaches the media provider', async () => {
    expect((await POST(request(Buffer.from('not a valid MP4 video')))).status).toBe(415);
    expect(create).not.toHaveBeenCalled();
  });
  it('stores an owner-linked media record and returns its permanent ID and URL', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(media);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'media', data: expect.objectContaining({ owner: 'owner-id' }), file: expect.objectContaining({ mimetype: 'video/mp4', data: mp4 }),
    }));
  });
  it('reports provider failures instead of creating an apparent success', async () => {
    create.mockRejectedValue(new Error('ImgBed failed'));
    expect((await POST(request())).status).toBe(502);
  });
});

describe('video content persistence', () => {
  it('reopens populated media as a stable ID and round-trips it through Lexical JSON', () => {
    const normalized = normalizeArticleContentForEditor(content);
    expect((normalized.root.children[0] as unknown as { fields: { media: string } }).fields.media).toBe(media.id);
    const editor = createEditor({ nodes: [VideoServerNode], onError: (error) => { throw error; } });
    const state = editor.parseEditorState(JSON.stringify(normalized));
    expect(state.toJSON()).toEqual(normalized);
    expect(articleContentHasMeaningfulContent(normalized)).toBe(true);
    expect(articleContentToMarkdown(content)).toContain(`[${media.filename}](${media.url})`);
    expect((content.root.children[0] as unknown as { fields: { media: object } }).fields.media).toEqual(media);
  });
});
