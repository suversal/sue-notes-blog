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

type RichNode = Record<string, unknown> & {
  children?: RichNode[];
  fields?: Record<string, unknown>;
  format?: number | string;
  tag?: string;
  text?: string;
  type?: string;
  value?: unknown;
};

const bareUrlPattern = /https?:\/\/[^\s<>"']+/giu;
const trailingUrlPunctuationPattern = /[.,!?;:，。！？；：、）》】}]+$/u;

function textNodeWithValue(node: RichNode, text: string): RichNode {
  return { ...node, text };
}

function linkifyTextNode(node: RichNode): RichNode[] {
  const text = node.text;
  if (!text || typeof node.format === 'number' && (node.format & 16) !== 0) return [node];

  const nodes: RichNode[] = [];
  let cursor = 0;
  let linked = false;
  for (const match of text.matchAll(bareUrlPattern)) {
    const start = match.index;
    const matched = match[0];
    const trailing = matched.match(trailingUrlPunctuationPattern)?.[0] ?? '';
    const url = trailing ? matched.slice(0, -trailing.length) : matched;
    if (!url) continue;

    if (start > cursor) nodes.push(textNodeWithValue(node, text.slice(cursor, start)));
    nodes.push({
      type: 'autolink',
      children: [textNodeWithValue(node, url)],
      direction: null,
      fields: { doc: null, linkType: 'custom', newTab: false, url },
      format: '',
      indent: 0,
      version: 2,
    });
    if (trailing) nodes.push(textNodeWithValue(node, trailing));
    cursor = start + matched.length;
    linked = true;
  }
  if (!linked) return [node];
  if (cursor < text.length) nodes.push(textNodeWithValue(node, text.slice(cursor)));
  return nodes;
}

export function linkifyArticleContentUrls(content: ArticleContent): ArticleContent {
  const next = structuredClone(content) as ArticleContent;
  const visit = (node: RichNode) => {
    if (!Array.isArray(node.children) || node.type === 'link' || node.type === 'autolink' || node.type === 'code') return;
    node.children = node.children.flatMap<RichNode>((child) => {
      if (child.type === 'text') return linkifyTextNode(child);
      visit(child);
      return [child];
    });
  };
  visit(next.root as RichNode);
  return next;
}

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
