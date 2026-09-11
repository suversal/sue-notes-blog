import { describe, expect, it } from 'vitest';
import { articleContentToMarkdown } from '../../src/lib/article-content-markdown';
import { articleContentHasMeaningfulContent, normalizeArticleContentForEditor, type ArticleContent } from '../../src/lib/article-content-data';

const root = (children: Record<string, unknown>[]) => ({
  root: { type: 'root', children, direction: null, format: '', indent: 0, version: 1 },
}) as ArticleContent;

const text = (value: string, format = 0) => ({ type: 'text', text: value, format, detail: 0, mode: 'normal', style: '', version: 1 });
const block = (type: string, children: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({ type, children, direction: null, format: '', indent: 0, version: 1, ...extra });

describe('Lexical Markdown export', () => {
  it('exports headings, inline formatting, links and paragraphs', () => {
    const content = root([
      block('heading', [text('结构化正文')], { tag: 'h2' }),
      block('paragraph', [text('保留'), text('加粗', 1), text('与'), { type: 'link', url: 'https://example.com', children: [text('链接')], version: 3 }]),
    ]);

    expect(articleContentToMarkdown(content)).toBe('## 结构化正文\n\n保留**加粗**与[链接](https://example.com)');
  });

  it('exports ordered, checklist and fenced code blocks', () => {
    const content = root([
      block('list', [
        block('listitem', [block('paragraph', [text('第一项')])]),
        block('listitem', [block('paragraph', [text('第二项')])]),
      ], { listType: 'number', start: 3 }),
      block('list', [block('listitem', [block('paragraph', [text('完成')])], { checked: true })], { listType: 'check' }),
      block('code', [text('const answer = 42;')], { language: 'ts' }),
    ]);

    expect(articleContentToMarkdown(content)).toBe('3. 第一项\n4. 第二项\n\n- [x] 完成\n\n```ts\nconst answer = 42;\n```');
  });

  it('exports populated ImgBed uploads with their accessible description', () => {
    const content = root([{
      type: 'upload',
      version: 3,
      format: '',
      id: 'upload-node',
      relationTo: 'media',
      fields: {},
      value: {
        id: 'media-id',
        alt: '编辑器中的预览画面',
        filename: 'preview.png',
        mimeType: 'image/png',
        url: 'https://img.suversal.com/file/knowhub/preview.png',
      },
    }]);

    expect(articleContentToMarkdown(content))
      .toBe('![编辑器中的预览画面](https://img.suversal.com/file/knowhub/preview.png)');
  });

  it('depopulates upload relations before passing content back to Lexical', () => {
    const content = root([{
      type: 'upload',
      version: 3,
      relationTo: 'media',
      value: { id: 'media-id', alt: '图片说明' },
    }]);

    const normalized = normalizeArticleContentForEditor(content) as unknown as {
      root: { children: { value: unknown }[] };
    };

    expect(normalized.root.children[0]?.value).toBe('media-id');
    expect((content as unknown as { root: { children: { value: unknown }[] } }).root.children[0]?.value)
      .toEqual({ id: 'media-id', alt: '图片说明' });
  });

  it('treats an image-only document as meaningful article content', () => {
    const content = root([{
      type: 'upload',
      version: 3,
      relationTo: 'media',
      value: 'media-id',
    }]);

    expect(articleContentHasMeaningfulContent(content)).toBe(true);
  });
});
