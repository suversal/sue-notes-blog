import { describe, expect, it } from 'vitest';
import { inspectObsidianFolder, normalizeObsidianAttachmentSource, pathInsideSelectedFolder } from '../../src/lib/obsidian-folder';
import { extractObsidianDocument, readObsidianArchive, readObsidianFiles, resolveObsidianAssetPath } from '../../src/lib/obsidian-import';
import { markdownToArticleContentStable } from '../../src/lib/markdown-to-article-content';

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(files: Array<{ data: Buffer | string; name: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

describe('Obsidian article import', () => {
  it('inspects one parent folder with multiple articles and a shared attachment directory', () => {
    const inspected = inspectObsidianFolder([
      { name: '文章 B.md', webkitRelativePath: 'ghostty/文章 B.md' },
      { name: '文章 A.md', webkitRelativePath: 'ghostty/文章 A.md' },
      { name: 'Pasted image.png', webkitRelativePath: 'ghostty/asserts/Pasted image.png' },
      { name: '嵌套文章.md', webkitRelativePath: 'ghostty/archive/嵌套文章.md' },
    ]);

    expect(inspected.rootName).toBe('ghostty');
    expect(inspected.markdownFiles.map((file) => file.name)).toEqual(['文章 A.md', '文章 B.md']);
    expect(inspected.attachmentDirectories).toEqual(['asserts']);
    expect(inspected.imageFiles).toHaveLength(1);
    expect(pathInsideSelectedFolder('ghostty/asserts/Pasted image.png')).toBe('asserts/Pasted image.png');
  });

  it('normalizes current assets and legacy asserts references without accepting unsafe paths', () => {
    expect(normalizeObsidianAttachmentSource('assets/Pasted%20image.png')).toBe('assets/Pasted image.png');
    expect(normalizeObsidianAttachmentSource('./asserts/旧图.png')).toBe('asserts/旧图.png');
    expect(normalizeObsidianAttachmentSource('../assets/outside.png')).toBeNull();
    expect(normalizeObsidianAttachmentSource('https://example.com/image.png')).toBeNull();
  });

  it('reads the title from frontmatter and removes a duplicate first-level heading', () => {
    expect(extractObsidianDocument([
      '---',
      'title: "一篇 Obsidian 手记"',
      '---',
      '',
      '# 页面标题',
      '',
      '正文内容。',
    ].join('\n'), 'article.md')).toEqual({
      title: '一篇 Obsidian 手记',
      bodyMarkdown: '正文内容。',
    });
  });

  it('falls back to the first heading and then the filename', () => {
    expect(extractObsidianDocument('# 标题来自正文\n\n正文', 'notes/fallback.md').title).toBe('标题来自正文');
    expect(extractObsidianDocument('只有正文', 'notes/文件名标题.md').title).toBe('文件名标题');
  });

  it('resolves URL-encoded images in the sibling assets directory', () => {
    expect(resolveObsidianAssetPath(
      'article-package/文章.md',
      'assets/Pasted%20image%2020260918101852.png',
    )).toBe('article-package/assets/Pasted image 20260918101852.png');
    expect(resolveObsidianAssetPath(
      'article-package/文章.md',
      'asserts/Pasted%20image.png',
    )).toBe('article-package/asserts/Pasted image.png');
  });

  it('reads a wrapped ZIP and ignores macOS metadata Markdown files', async () => {
    const archive = await readObsidianArchive(storedZip([
      { name: 'bundle/article.md', data: '# 标题\n\n![](assets/Pasted%20image.png)' },
      { name: 'bundle/assets/Pasted image.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      { name: '__MACOSX/bundle/._article.md', data: 'resource fork' },
    ]));

    expect(archive.markdownPath).toBe('bundle/article.md');
    expect(archive.files.has('bundle/assets/Pasted image.png')).toBe(true);
    expect(archive.files.has('__MACOSX/bundle/._article.md')).toBe(false);
  });

  it('accepts a directly selected Markdown file and assets folder', () => {
    const input = readObsidianFiles(
      { path: '文章.md', data: Buffer.from('# 标题\n\n![](assets/Pasted%20image.png)') },
      [{ path: 'assets/Pasted image.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
    );

    expect(input.markdownPath).toBe('文章.md');
    expect(input.markdown).toContain('# 标题');
    expect(input.files.has('assets/Pasted image.png')).toBe(true);
  });

  it('rejects remote, file and out-of-scope image paths', () => {
    for (const source of [
      'https://example.com/image.png',
      'file:///Users/sue/image.png',
      '../image.png',
      'other/image.png',
    ]) {
      expect(() => resolveObsidianAssetPath('文章.md', source), source).toThrow(/assets|相对路径|越界/);
    }
  });

  it('converts GFM blocks and media placeholders without starting a Lexical editor', () => {
    const content = markdownToArticleContentStable([
      '## 小节',
      '',
      '正文包含 **加粗**、[链接](https://example.com) 和 `代码`。',
      '',
      '- [x] 已完成',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| answer | 42 |',
      '',
      '```ts',
      'const answer = 42;',
      '```',
      '',
      '![media:media-id]()',
    ].join('\n')) as unknown as { root: { children: Array<{ type: string }> } };

    expect(content.root.children.map((node) => node.type)).toEqual([
      'heading', 'paragraph', 'list', 'table', 'code', 'upload',
    ]);
  });
});
