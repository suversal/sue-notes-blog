import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';

type MarkdownNode = {
  alt?: null | string;
  children?: MarkdownNode[];
  identifier?: string;
  title?: null | string;
  type: string;
  url?: string;
};

export type ImportedImage = { alt: string; id: string };
export type ImportImage = (image: { alt: string; source: string }) => Promise<ImportedImage>;

function visit(node: MarkdownNode, callback: (node: MarkdownNode, parent?: MarkdownNode, index?: number) => void, parent?: MarkdownNode, index?: number) {
  callback(node, parent, index);
  node.children?.forEach((child, childIndex) => visit(child, callback, node, childIndex));
}

function normalizedIdentifier(value: string | undefined) {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
}

/**
 * Payload's upload transformer intentionally imports only ![relation:id]() placeholders.
 * This pass resolves normal CommonMark images, archives each source, and emits that official format.
 */
export async function rewriteMarkdownImages(markdown: string, importImage: ImportImage) {
  const tree = fromMarkdown(markdown) as unknown as MarkdownNode;
  const definitions = new Map<string, MarkdownNode>();
  visit(tree, (node) => {
    if (node.type === 'definition' && node.identifier && node.url) definitions.set(normalizedIdentifier(node.identifier), node);
  });

  const jobs: { alt: string; node: MarkdownNode; parent: MarkdownNode | undefined; index: number | undefined; source: string }[] = [];
  visit(tree, (node, parent, index) => {
    if (node.type === 'image' && node.url) {
      jobs.push({ alt: node.alt?.trim() || '导入图片', node, parent, index, source: node.url });
      return;
    }
    if (node.type === 'imageReference' && node.identifier) {
      const definition = definitions.get(normalizedIdentifier(node.identifier));
      if (definition?.url) jobs.push({ alt: node.alt?.trim() || '导入图片', node, parent, index, source: definition.url });
    }
  });

  const bySource = new Map<string, Promise<ImportedImage>>();
  for (const job of jobs) {
    let imported = bySource.get(job.source);
    if (!imported) {
      imported = importImage({ alt: job.alt, source: job.source });
      bySource.set(job.source, imported);
    }
    const image = await imported;
    const placeholder: MarkdownNode = { type: 'image', alt: `media:${image.id}`, title: null, url: '' };
    if (job.parent?.children && job.index !== undefined) job.parent.children[job.index] = placeholder;
  }

  const referencedDefinitions = new Set<string>();
  visit(tree, (node) => {
    if ((node.type === 'imageReference' || node.type === 'linkReference') && node.identifier) {
      referencedDefinitions.add(normalizedIdentifier(node.identifier));
    }
  });
  if (tree.children) {
    tree.children = tree.children.filter((node) => node.type !== 'definition' || referencedDefinitions.has(normalizedIdentifier(node.identifier)));
  }

  return { markdown: toMarkdown(tree as never), imageCount: jobs.length };
}
