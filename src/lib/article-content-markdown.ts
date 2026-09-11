import type { ArticleContent } from './article-content-data';

type LexicalNode = {
  altText?: string;
  checked?: boolean;
  children?: LexicalNode[];
  fields?: Record<string, unknown>;
  format?: number | string;
  language?: string;
  listType?: 'bullet' | 'check' | 'number';
  newTab?: boolean;
  start?: number;
  tag?: string;
  text?: string;
  title?: string;
  type?: string;
  url?: string;
  value?: unknown;
};

const TEXT_FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
  subscript: 32,
  superscript: 64,
  highlight: 128,
} as const;

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]<>])/g, '\\$1');
}

function inlineCode(value: string) {
  const longestRun = Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = '`'.repeat(longestRun + 1);
  const padding = /^`|`$|^\s|\s$/.test(value) ? ' ' : '';
  return `${fence}${padding}${value}${padding}${fence}`;
}

function textToMarkdown(node: LexicalNode) {
  const format = typeof node.format === 'number' ? node.format : 0;
  if (format & TEXT_FORMAT.code) return inlineCode(node.text ?? '');

  let value = escapeMarkdown(node.text ?? '');
  if (!value) return value;
  if (format & TEXT_FORMAT.bold) value = `**${value}**`;
  if (format & TEXT_FORMAT.italic) value = `*${value}*`;
  if (format & TEXT_FORMAT.strikethrough) value = `~~${value}~~`;
  if (format & TEXT_FORMAT.underline) value = `<u>${value}</u>`;
  if (format & TEXT_FORMAT.subscript) value = `<sub>${value}</sub>`;
  if (format & TEXT_FORMAT.superscript) value = `<sup>${value}</sup>`;
  if (format & TEXT_FORMAT.highlight) value = `<mark>${value}</mark>`;
  return value;
}

function childMarkdown(node: LexicalNode): string {
  return (node.children ?? []).map(inlineNodeToMarkdown).join('');
}

function inlineNodeToMarkdown(node: LexicalNode): string {
  if (node.type === 'text') return textToMarkdown(node);
  if (node.type === 'linebreak') return '  \n';
  if (node.type === 'tab') return '\t';
  if (node.type === 'link' || node.type === 'autolink') {
    const label = childMarkdown(node) || escapeMarkdown(node.url ?? '');
    const title = node.title ? ` "${node.title.replaceAll('"', '\\"')}"` : '';
    return node.url ? `[${label}](${node.url}${title})` : label;
  }
  return childMarkdown(node);
}

function plainNodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text;
  return (node.children ?? []).map(plainNodeText).join('');
}

function listToMarkdown(node: LexicalNode, depth = 0): string {
  const listType = node.listType ?? 'bullet';
  let ordinal = node.start ?? 1;
  return (node.children ?? []).map((item) => {
    const children = item.children ?? [];
    const nested = children.filter((child) => child.type === 'list');
    const content = children.filter((child) => child.type !== 'list')
      .map((child) => blockNodeToMarkdown(child).trim())
      .filter(Boolean)
      .join('\n');
    const marker = listType === 'number'
      ? `${ordinal++}.`
      : listType === 'check'
        ? `- [${item.checked ? 'x' : ' '}]`
        : '-';
    const continuation = content.split('\n');
    const first = `${'  '.repeat(depth)}${marker} ${continuation.shift() ?? ''}`.trimEnd();
    const rest = continuation.map((line) => `${'  '.repeat(depth + 1)}${line}`).join('\n');
    const nestedMarkdown = nested.map((child) => listToMarkdown(child, depth + 1)).join('\n');
    return [first, rest, nestedMarkdown].filter(Boolean).join('\n');
  }).join('\n');
}

function uploadToMarkdown(node: LexicalNode) {
  const value = node.value && typeof node.value === 'object' ? node.value as Record<string, unknown> : undefined;
  const fields = node.fields ?? {};
  const url = typeof value?.url === 'string' ? value.url : typeof fields.url === 'string' ? fields.url : undefined;
  const filename = typeof value?.filename === 'string' ? value.filename : typeof fields.filename === 'string' ? fields.filename : '附件';
  const alt = node.altText
    || (typeof fields.alt === 'string' ? fields.alt : undefined)
    || (typeof value?.alt === 'string' ? value.alt : filename);
  const mimeType = typeof value?.mimeType === 'string' ? value.mimeType : typeof fields.mimeType === 'string' ? fields.mimeType : '';
  if (!url) return `<!-- 暂无可导出的附件地址：${escapeMarkdown(filename)} -->`;
  return mimeType.startsWith('image/') ? `![${escapeMarkdown(alt)}](${url})` : `[${escapeMarkdown(filename)}](${url})`;
}

function blockNodeToMarkdown(node: LexicalNode): string {
  switch (node.type) {
    case 'paragraph':
      return childMarkdown(node);
    case 'heading': {
      const level = Number(node.tag?.slice(1));
      return `${'#'.repeat(Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2)} ${childMarkdown(node)}`;
    }
    case 'quote':
      return plainNodeText(node).split('\n').map((line) => `> ${escapeMarkdown(line)}`).join('\n');
    case 'list':
      return listToMarkdown(node);
    case 'code': {
      const code = plainNodeText(node).replace(/\n$/, '');
      const longestRun = Math.max(2, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
      const fence = '`'.repeat(longestRun + 1);
      return `${fence}${node.language ?? ''}\n${code}\n${fence}`;
    }
    case 'horizontalrule':
      return '---';
    case 'upload':
      return uploadToMarkdown(node);
    case 'linebreak':
      return '  \n';
    default:
      return childMarkdown(node) || plainNodeText(node);
  }
}

/**
 * 将持久化的 Lexical JSON 直接序列化为 Markdown。
 *
 * 这里刻意不创建 Headless Lexical 编辑器：导出路由因此不依赖浏览器构建器如何
 * 拆分 lexical 包，也把将来升级 Payload/Lexical 时的兼容面收敛在这个文件里。
 */
export function articleContentToMarkdown(content: ArticleContent): string {
  const root = content.root as LexicalNode;
  return (root.children ?? [])
    .map(blockNodeToMarkdown)
    .map((block) => block.trimEnd())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
