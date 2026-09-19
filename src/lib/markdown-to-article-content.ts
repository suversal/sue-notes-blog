import { randomUUID } from 'node:crypto';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import type { ArticleContent } from './article-content-data';

type MarkdownNode = {
  alt?: null | string;
  checked?: boolean | null;
  children?: MarkdownNode[];
  depth?: number;
  identifier?: string;
  lang?: null | string;
  ordered?: boolean;
  start?: null | number;
  title?: null | string;
  type: string;
  url?: string;
  value?: string;
};

type LexicalNode = Record<string, unknown> & { children?: LexicalNode[]; type: string };

const TEXT_FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  code: 16,
} as const;

function textNode(text: string, format = 0): LexicalNode {
  return { type: 'text', detail: 0, format, mode: 'normal', style: '', text, version: 1 };
}

function paragraphNode(children: LexicalNode[]): LexicalNode {
  return {
    type: 'paragraph',
    children: children.length ? children : [textNode('')],
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    version: 1,
  };
}

function definitions(root: MarkdownNode) {
  const result = new Map<string, MarkdownNode>();
  for (const child of root.children ?? []) {
    if (child.type === 'definition' && child.identifier) result.set(child.identifier.toLowerCase(), child);
  }
  return result;
}

function uploadNode(node: MarkdownNode): LexicalNode | undefined {
  const mediaId = /^media:(.+)$/.exec(node.alt?.trim() ?? '')?.[1];
  if (!mediaId || node.url) return undefined;
  return {
    type: 'upload',
    fields: {},
    format: '',
    id: randomUUID(),
    relationTo: 'media',
    value: mediaId,
    version: 3,
  };
}

function inlineNodes(nodes: MarkdownNode[] | undefined, definitionMap: Map<string, MarkdownNode>, format = 0): LexicalNode[] {
  const result: LexicalNode[] = [];
  for (const node of nodes ?? []) {
    switch (node.type) {
      case 'text':
        result.push(textNode(node.value ?? '', format));
        break;
      case 'strong':
        result.push(...inlineNodes(node.children, definitionMap, format | TEXT_FORMAT.bold));
        break;
      case 'emphasis':
        result.push(...inlineNodes(node.children, definitionMap, format | TEXT_FORMAT.italic));
        break;
      case 'delete':
        result.push(...inlineNodes(node.children, definitionMap, format | TEXT_FORMAT.strikethrough));
        break;
      case 'inlineCode':
        result.push(textNode(node.value ?? '', format | TEXT_FORMAT.code));
        break;
      case 'break':
        result.push({ type: 'linebreak', version: 1 });
        break;
      case 'html':
        result.push(textNode(node.value ?? '', format));
        break;
      case 'link': {
        const children = inlineNodes(node.children, definitionMap, format);
        result.push({
          type: 'link',
          children: children.length ? children : [textNode(node.url ?? '', format)],
          direction: null,
          fields: { doc: null, linkType: 'custom', newTab: false, url: node.url ?? '' },
          format: '',
          indent: 0,
          version: 3,
        });
        break;
      }
      case 'linkReference': {
        const definition = node.identifier ? definitionMap.get(node.identifier.toLowerCase()) : undefined;
        const children = inlineNodes(node.children, definitionMap, format);
        if (!definition?.url) result.push(...children);
        else result.push({
          type: 'link',
          children,
          direction: null,
          fields: { doc: null, linkType: 'custom', newTab: false, url: definition.url },
          format: '',
          indent: 0,
          version: 3,
        });
        break;
      }
      default:
        result.push(...inlineNodes(node.children, definitionMap, format));
    }
  }
  return result;
}

function paragraphBlocks(node: MarkdownNode, definitionMap: Map<string, MarkdownNode>) {
  const blocks: LexicalNode[] = [];
  let inline: MarkdownNode[] = [];
  const flush = () => {
    if (!inline.length) return;
    blocks.push(paragraphNode(inlineNodes(inline, definitionMap)));
    inline = [];
  };
  for (const child of node.children ?? []) {
    const upload = child.type === 'image' ? uploadNode(child) : undefined;
    if (!upload) inline.push(child);
    else {
      flush();
      blocks.push(upload);
    }
  }
  flush();
  return blocks.length ? blocks : [paragraphNode([])];
}

function quoteNode(node: MarkdownNode, definitionMap: Map<string, MarkdownNode>): LexicalNode {
  const children: LexicalNode[] = [];
  for (const child of node.children ?? []) {
    if (children.length) children.push({ type: 'linebreak', version: 1 });
    if (child.type === 'paragraph' || child.type === 'heading') children.push(...inlineNodes(child.children, definitionMap));
    else if (typeof child.value === 'string') children.push(textNode(child.value));
    else children.push(...inlineNodes(child.children, definitionMap));
  }
  return { type: 'quote', children, direction: null, format: '', indent: 0, version: 1 };
}

function listNode(node: MarkdownNode, definitionMap: Map<string, MarkdownNode>): LexicalNode {
  const checkedList = (node.children ?? []).some((item) => typeof item.checked === 'boolean');
  const listType = node.ordered ? 'number' : checkedList ? 'check' : 'bullet';
  const start = node.ordered ? node.start ?? 1 : 1;
  return {
    type: 'list',
    children: (node.children ?? []).map((item, index) => {
      const children: LexicalNode[] = [];
      for (const child of item.children ?? []) {
        if (child.type === 'paragraph') children.push(...inlineNodes(child.children, definitionMap));
        else if (child.type === 'list') children.push(listNode(child, definitionMap));
        else children.push(...blockNodes(child, definitionMap));
      }
      return {
        type: 'listitem',
        checked: typeof item.checked === 'boolean' ? item.checked : undefined,
        children: children.length ? children : [textNode('')],
        direction: null,
        format: '',
        indent: 0,
        value: start + index,
        version: 1,
      };
    }),
    direction: null,
    format: '',
    indent: 0,
    listType,
    start,
    tag: node.ordered ? 'ol' : 'ul',
    version: 1,
  };
}

function tableNode(node: MarkdownNode, definitionMap: Map<string, MarkdownNode>): LexicalNode {
  return {
    type: 'table',
    children: (node.children ?? []).map((row, rowIndex) => ({
      type: 'tablerow',
      children: (row.children ?? []).map((cell) => ({
        type: 'tablecell',
        backgroundColor: null,
        children: [paragraphNode(inlineNodes(cell.children, definitionMap))],
        colSpan: 1,
        direction: null,
        format: '',
        headerState: rowIndex === 0 ? 1 : 0,
        indent: 0,
        rowSpan: 1,
        version: 1,
      })),
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    })),
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  };
}

function blockNodes(node: MarkdownNode, definitionMap: Map<string, MarkdownNode>): LexicalNode[] {
  switch (node.type) {
    case 'paragraph':
      return paragraphBlocks(node, definitionMap);
    case 'heading':
      return [{
        type: 'heading',
        children: inlineNodes(node.children, definitionMap),
        direction: null,
        format: '',
        indent: 0,
        tag: `h${Math.min(6, Math.max(1, node.depth ?? 2))}`,
        version: 1,
      }];
    case 'blockquote':
      return [quoteNode(node, definitionMap)];
    case 'list':
      return [listNode(node, definitionMap)];
    case 'code':
      return [{
        type: 'code',
        children: [textNode(node.value ?? '')],
        direction: null,
        format: '',
        indent: 0,
        language: node.lang ?? undefined,
        version: 1,
      }];
    case 'thematicBreak':
      return [{ type: 'horizontalrule', version: 1 }];
    case 'table':
      return [tableNode(node, definitionMap)];
    case 'html':
      return [paragraphNode([textNode(node.value ?? '')])];
    case 'definition':
      return [];
    default:
      return (node.children ?? []).flatMap((child) => blockNodes(child, definitionMap));
  }
}

/**
 * Convert Markdown to persisted Lexical JSON without creating a Lexical editor.
 * This avoids the duplicate-Lexical-module failure that can occur in bundled server runtimes.
 */
export function markdownToArticleContentStable(markdown: string): ArticleContent {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as unknown as MarkdownNode;
  const definitionMap = definitions(tree);
  const children = (tree.children ?? []).flatMap((node) => blockNodes(node, definitionMap));
  return {
    root: {
      type: 'root',
      children: children.length ? children : [paragraphNode([])],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  } as ArticleContent;
}
