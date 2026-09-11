import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical';

export type ArticleContent = DefaultTypedEditorState;

export const emptyArticleContent: ArticleContent = {
  root: {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: '', version: 1 }],
      direction: null,
      format: '',
      indent: 0,
      textFormat: 0,
      textStyle: '',
      version: 1,
    }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
};

type RichNode = {
  children?: RichNode[];
  tag?: string;
  text?: string;
  type?: string;
  value?: unknown;
};

export function isArticleContent(value: unknown): value is ArticleContent {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('root' in value)) return false;
  const root = (value as { root?: RichNode }).root;
  return Boolean(root && root.type === 'root' && Array.isArray(root.children));
}

export function parseArticleContent(value: FormDataEntryValue | null): ArticleContent {
  if (typeof value !== 'string' || !value.trim()) throw new Error('正文不能为空。');
  const parsed: unknown = JSON.parse(value);
  if (!isArticleContent(parsed)) throw new Error('正文格式无效。');
  return parsed;
}

function nodeText(node: RichNode): string {
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map(nodeText).join('');
}

export function articleContentPlainText(content: ArticleContent): string {
  const root = content.root as RichNode;
  return (root.children ?? []).map(nodeText).join('\n');
}

export function articleContentHasMeaningfulContent(content: ArticleContent): boolean {
  if (articleContentPlainText(content).trim()) return true;
  let hasUpload = false;
  const visit = (node: RichNode) => {
    if (node.type === 'upload') hasUpload = true;
    if (!hasUpload) for (const child of node.children ?? []) visit(child);
  };
  visit(content.root as RichNode);
  return hasUpload;
}

export function articleContentHeadings(content: ArticleContent): string[] {
  const headings: string[] = [];
  const visit = (node: RichNode) => {
    if (node.type === 'heading' && (node.tag === 'h1' || node.tag === 'h2')) {
      const text = nodeText(node).trim();
      if (text) headings.push(text);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(content.root as RichNode);
  return headings;
}

export function normalizeArticleContentForEditor(content: ArticleContent): ArticleContent {
  const next = structuredClone(content) as ArticleContent;
  const visit = (node: RichNode) => {
    if (node.type === 'upload' && node.value && typeof node.value === 'object' && 'id' in node.value) {
      const id = (node.value as { id?: unknown }).id;
      if (typeof id === 'string' || typeof id === 'number') node.value = id;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(next.root as RichNode);
  return next;
}
