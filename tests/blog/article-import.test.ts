import { describe, expect, it, vi } from 'vitest';
import { findMarkdownImageSources, rewriteMarkdownImages } from '../../src/lib/article-import';
import { isEditorImageFile } from '../../src/lib/editor-image-file';
import { detectImageMimeType, isForbiddenRemoteAddress, parseDataImage } from '../../src/lib/remote-image';

describe('article image import', () => {
  it('finds unique inline and referenced image sources before folder upload', () => {
    expect(findMarkdownImageSources([
      '![](assets/one.png)',
      '![](assets/one.png)',
      '![第二张][two]',
      '',
      '[two]: assets/two.png',
    ].join('\n'))).toEqual(['assets/one.png', 'assets/two.png']);
  });

  it('rewrites inline and reference Markdown images to Payload media placeholders', async () => {
    const upload = vi.fn(async ({ alt, source }: { alt: string; source: string }) => ({
      id: source.includes('first') ? 'media-first' : 'media-second',
      alt,
    }));

    const markdown = [
      '# 标题',
      '',
      '![第一张](https://images.example.com/first.png)',
      '',
      '中间的 **加粗** 保留。',
      '',
      '![第二张][preview]',
      '',
      '[preview]: https://images.example.com/second.webp "Preview"',
    ].join('\n');

    const result = await rewriteMarkdownImages(markdown, upload);

    expect(result.markdown).toContain('![media:media-first]()');
    expect(result.markdown).toContain('![media:media-second]()');
    expect(result.markdown).toContain('**加粗**');
    expect(result.markdown).not.toContain('[preview]:');
    expect(result.imageCount).toBe(2);
    expect(upload).toHaveBeenNthCalledWith(1, { alt: '第一张', source: 'https://images.example.com/first.png' });
    expect(upload).toHaveBeenNthCalledWith(2, { alt: '第二张', source: 'https://images.example.com/second.webp' });
  });

  it('deduplicates repeated image sources while preserving both positions', async () => {
    const upload = vi.fn(async () => ({ id: 'same-media', alt: '同一张图' }));
    const result = await rewriteMarkdownImages(
      '![图一](https://images.example.com/shared.png)\n\n![图二](https://images.example.com/shared.png)',
      upload,
    );

    expect(result.markdown.match(/!\[media:same-media\]\(\)/g)).toHaveLength(2);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('leaves Markdown without images unchanged apart from canonical formatting', async () => {
    const upload = vi.fn();
    const result = await rewriteMarkdownImages('## 标题\n\n正文', upload);
    expect(result.imageCount).toBe(0);
    expect(result.markdown).toBe('## 标题\n\n正文\n');
    expect(upload).not.toHaveBeenCalled();
  });

  it('preserves GFM tables and task lists while rewriting images', async () => {
    const result = await rewriteMarkdownImages([
      '| 名称 | 状态 |',
      '| --- | --- |',
      '| 导入 | 完成 |',
      '',
      '- [x] 保留任务',
    ].join('\n'), vi.fn());

    expect(result.markdown).toContain('| 名称 | 状态 |');
    expect(result.markdown).toMatch(/[*-] \[x] 保留任务/);
  });
});

describe('remote image safety', () => {
  it('blocks local, private, link-local and documentation addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '100.64.0.1', '169.254.169.254', '192.168.1.1', '198.51.100.4', '::1', 'fc00::1', 'fe80::1']) {
      expect(isForbiddenRemoteAddress(address), address).toBe(true);
    }
    expect(isForbiddenRemoteAddress('1.1.1.1')).toBe(false);
    expect(isForbiddenRemoteAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('detects supported image signatures instead of trusting response headers', () => {
    expect(detectImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('image/jpeg');
    expect(detectImageMimeType(Buffer.from('not an image'))).toBeNull();
  });

  it('accepts bounded base64 image data and rejects unsupported content', () => {
    const png = parseDataImage(`data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64')}`);
    expect(png.mimeType).toBe('image/png');
    expect(() => parseDataImage('data:image/svg+xml;base64,PHN2Zy8+')).toThrow('不支持');
  });
});

describe('editor image upload', () => {
  it('accepts a valid multipart file even when it is not from globalThis.File', () => {
    const crossRealmFile = {
      arrayBuffer: async () => new ArrayBuffer(8),
      name: 'clipboard.png',
      size: 8,
      type: 'image/png',
    };

    expect(isEditorImageFile(crossRealmFile)).toBe(true);
  });

  it('rejects missing, empty, and string form fields', () => {
    expect(isEditorImageFile(null)).toBe(false);
    expect(isEditorImageFile('clipboard.png')).toBe(false);
    expect(isEditorImageFile({ arrayBuffer: async () => new ArrayBuffer(0), name: 'empty.png', size: 0, type: 'image/png' })).toBe(false);
  });
});
