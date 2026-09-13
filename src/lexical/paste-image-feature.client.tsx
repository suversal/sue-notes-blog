'use client';

import { $generateNodesFromDOM } from '@lexical/html';
import { $convertFromMarkdownString, TRANSFORMERS, type ElementTransformer } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $createUploadNode, createClientFeature, UploadNode } from '@payloadcms/richtext-lexical/client';
import {
  $applyNodeReplacement,
  $getRoot,
  $getNodeByKey,
  $nodesOfType,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DecoratorNode,
  PASTE_COMMAND,
  type EditorConfig,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
  type SerializedLexicalNode,
} from 'lexical';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '../app/articles/admin-v1.module.css';

const ALLOWED_IMAGE_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']);
export const EDITOR_IMPORT_STATE_EVENT = 'knowhub:editor-import-state';

type UploadedImage = { alt: string; id: string; url: null | string | undefined };
type UploadStatus = { kind: 'error' | 'idle' | 'success' | 'uploading' | 'warning'; message: string };
type PasteOutcome = Pick<UploadStatus, 'kind' | 'message'>;
type SerializedPasteImageLoadingNode = SerializedLexicalNode & { label: string; token: string };

class PasteImageLoadingNode extends DecoratorNode<ReactNode> {
  __label: string;
  __token: string;

  static getType() {
    return 'paste-image-loading';
  }

  static clone(node: PasteImageLoadingNode) {
    return new PasteImageLoadingNode(node.__label, node.__token, node.__key);
  }

  static importJSON(node: SerializedPasteImageLoadingNode) {
    return new PasteImageLoadingNode(node.label, node.token);
  }

  constructor(label: string, token: string, key?: NodeKey) {
    super(key);
    this.__label = label;
    this.__token = token;
  }

  createDOM(_config: EditorConfig) {
    return document.createElement('div');
  }

  updateDOM() {
    return false;
  }

  exportJSON(): SerializedPasteImageLoadingNode {
    return { ...super.exportJSON(), label: this.__label, token: this.__token, type: 'paste-image-loading', version: 1 };
  }

  getToken() {
    return this.getLatest().__token;
  }

  decorate() {
    return <div className={styles.pasteImageLoading} role="status" aria-live="polite">
      <span aria-hidden="true" />
      <strong>{this.__label}</strong>
      <small>上传完成后，图片会显示在这里</small>
    </div>;
  }
}

function $createPasteImageLoadingNode(label: string, token: string) {
  return $applyNodeReplacement(new PasteImageLoadingNode(label, token));
}

const PAYLOAD_UPLOAD_TRANSFORMER: ElementTransformer = {
  type: 'element',
  dependencies: [UploadNode],
  export: () => null,
  regExp: /!\[media:([^\]]+)\]\(\)/,
  replace: (parentNode, _children, match, isImport) => {
    if (!isImport || !match[1]) return false;
    parentNode.replace($createUploadNode({
      data: { fields: {}, relationTo: 'media', value: match[1] },
    }));
    return true;
  },
};
const ARTICLE_MARKDOWN_TRANSFORMERS = [PAYLOAD_UPLOAD_TRANSFORMER, ...TRANSFORMERS];

function imageAlt(file: File) {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return base && !/^(image|pasted image)$/i.test(base) ? base.slice(0, 240) : '粘贴图片';
}

function clipboardImageFiles(clipboard: DataTransfer | null) {
  if (!clipboard) return [];
  const files = Array.from(clipboard.files).filter((file) => ALLOWED_IMAGE_TYPES.has(file.type));
  if (files.length) return files;

  // Some macOS applications expose copied images through DataTransfer.items
  // without also populating DataTransfer.files.
  return Array.from(clipboard.items)
    .filter((item) => item.kind === 'file' && ALLOWED_IMAGE_TYPES.has(item.type))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.set('file', file);
  form.set('alt', imageAlt(file));
  const response = await fetch('/api/editor/images', { method: 'POST', body: form });
  const result = await response.json().catch(() => ({})) as Partial<UploadedImage> & { message?: string };
  if (!response.ok || !result.id || !result.alt) throw new Error(result.message || '图片上传失败。');
  return { alt: result.alt, id: result.id, url: result.url };
}

async function uploadRemoteImage(source: string, alt: string): Promise<UploadedImage> {
  const response = await fetch('/api/editor/images/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alt, source }),
  });
  const result = await response.json().catch(() => ({})) as Partial<UploadedImage> & { message?: string };
  if (!response.ok || !result.id || !result.alt) throw new Error(result.message || '远程图片归档失败。');
  return { alt: result.alt, id: result.id, url: result.url };
}

function looksLikeMarkdownWithImages(value: string) {
  const inlineImage = /!\[[^\]\n]*\]\(\s*(?:https?:\/\/|data:image\/)/i.test(value);
  const referenceImage = /!\[[^\]\n]*\]\[[^\]\n]*\]/.test(value)
    && /^\s*\[[^\]\n]+\]:\s*(?:https?:\/\/|data:image\/)/im.test(value);
  return inlineImage || referenceImage;
}

function imageSource(image: HTMLImageElement) {
  const candidates = [
    image.getAttribute('data-src'),
    image.getAttribute('data-original'),
    image.getAttribute('data-lazy-src'),
    image.getAttribute('src'),
    image.getAttribute('data-srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0],
    image.getAttribute('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0],
  ].filter((value): value is string => Boolean(value));
  return candidates.find((value) => /^(?:https?:\/\/|data:image\/)/i.test(value));
}

function restoreSelection(savedSelection: RangeSelection | null) {
  if (savedSelection) {
    const anchor = $getNodeByKey(savedSelection.anchor.key);
    const focus = $getNodeByKey(savedSelection.focus.key);
    if (anchor?.getParent() && focus?.getParent()) {
      $setSelection(savedSelection);
      return;
    }
  }
  $getRoot().selectEnd();
}

function announceBusy(editor: LexicalEditor, busy: boolean) {
  editor.getRootElement()?.dispatchEvent(new CustomEvent(EDITOR_IMPORT_STATE_EVENT, { bubbles: true, detail: { busy } }));
}

function insertLoadingPlaceholder(editor: LexicalEditor, savedSelection: RangeSelection | null, imageCount: number) {
  const token = globalThis.crypto.randomUUID();
  editor.update(() => {
    restoreSelection(savedSelection);
    const node = $createPasteImageLoadingNode(imageCount > 1 ? `正在上传 ${imageCount} 张图片…` : '正在上传图片…', token);
    $insertNodeToNearestRoot(node);
  });
  return token;
}

function $loadingPlaceholder(token: string) {
  return $nodesOfType(PasteImageLoadingNode).find((node) => node.getToken() === token);
}

function removeLoadingPlaceholder(editor: LexicalEditor, token: string) {
  editor.update(() => $loadingPlaceholder(token)?.remove());
}

function insertUploadedImages(editor: LexicalEditor, images: UploadedImage[], savedSelection: RangeSelection | null, placeholderToken: string) {
  if (!images.length) return;
  editor.update(() => {
    const placeholder = $loadingPlaceholder(placeholderToken);
    if (!placeholder) restoreSelection(savedSelection);
    for (const image of images) {
      const upload = $createUploadNode({
        data: { fields: {}, id: globalThis.crypto.randomUUID(), relationTo: 'media', value: image.id },
      });
      if (placeholder) placeholder.insertBefore(upload);
      else $insertNodeToNearestRoot(upload);
    }
  });
}

function markImportedImage(image: HTMLImageElement, uploaded: UploadedImage, fallbackSource: string) {
  image.setAttribute('src', uploaded.url || fallbackSource);
  image.setAttribute('alt', image.alt.trim() || uploaded.alt);
  image.setAttribute('data-lexical-upload-relation-to', 'media');
  image.setAttribute('data-lexical-upload-id', uploaded.id);
  image.removeAttribute('srcset');
  image.removeAttribute('data-srcset');
}

function replaceWithImagePlaceholder(image: HTMLImageElement, index: number) {
  const placeholder = image.ownerDocument.createElement('span');
  const label = image.ownerDocument.createElement('strong');
  const alt = image.alt.trim();
  label.textContent = `【图片占位 ${index + 1}】`;
  placeholder.append(label, image.ownerDocument.createTextNode(
    ` ${alt ? `${alt} · ` : ''}请在此处重新粘贴图片`,
  ));
  image.replaceWith(placeholder);
}

function partialPasteOutcome(uploadedCount: number, failures: string[], hasText: boolean, placeholderCount = 0): PasteOutcome {
  const completed = hasText
    ? uploadedCount > 0 ? `文字和 ${uploadedCount} 张图片已粘贴` : '文字已粘贴'
    : `${uploadedCount} 张图片已粘贴`;
  const reason = failures[0] || '剪贴板没有提供可读取的图片数据';
  if (placeholderCount > 0 && !hasText && uploadedCount === 0) {
    return {
      kind: 'warning',
      message: `${placeholderCount} 张图片无法读取，已在原位置保留占位符（${reason}）。请在占位符处重新粘贴图片。`,
    };
  }
  return {
    kind: 'warning',
    message: placeholderCount > 0
      ? `${completed}；另有 ${placeholderCount} 张图片已在原位置保留占位符（${reason}）。请在占位符处重新粘贴图片。`
      : `${completed}；另有 ${failures.length} 张图片未插入（${reason}）。请单独复制缺失图片后重试。`,
  };
}

function insertMarkdown(editor: LexicalEditor, markdown: string, savedSelection: RangeSelection | null, placeholderToken: string) {
  editor.update(() => {
    const root = $getRoot();
    const existingNodes = root.getChildren();
    $convertFromMarkdownString(markdown, ARTICLE_MARKDOWN_TRANSFORMERS, undefined, false, true);
    const importedNodes = root.getChildren();
    importedNodes.forEach((node) => node.remove());
    root.append(...existingNodes);
    const placeholder = $loadingPlaceholder(placeholderToken);
    if (placeholder) importedNodes.forEach((node) => placeholder.insertBefore(node));
    else {
      restoreSelection(savedSelection);
      $insertNodes(importedNodes);
    }
  });
}

function PasteImagePlugin() {
  const [editor] = useLexicalComposerContext();
  const importing = useRef(false);
  const [status, setStatus] = useState<UploadStatus>({ kind: 'idle', message: '' });

  useEffect(() => {
    editor.update(() => {
      $nodesOfType(PasteImageLoadingNode).forEach((node) => node.remove());
    });
  }, [editor]);

  useEffect(() => editor.registerCommand(PASTE_COMMAND, (event) => {
    if (!(event instanceof ClipboardEvent)) return false;
    const clipboard = event.clipboardData;
    const files = clipboardImageFiles(clipboard);
    const html = clipboard?.getData('text/html') ?? '';
    const markdown = clipboard?.getData('text/plain') ?? '';
    const hasHtmlImages = /<img\b/i.test(html);
    const hasMarkdownImages = looksLikeMarkdownWithImages(markdown);
    if (!files.length && !hasHtmlImages && !hasMarkdownImages) return false;

    event.preventDefault();
    event.stopPropagation();
    if (importing.current) {
      setStatus({ kind: 'error', message: '上一次图片导入还在进行，完成后再次粘贴。' });
      return true;
    }

    let savedSelection: RangeSelection | null = null;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) savedSelection = selection.clone();
    });
    const expectedImages = Math.max(files.length, (html.match(/<img\b/gi) ?? []).length, hasMarkdownImages ? 1 : 0);
    const loadingPlaceholderToken = insertLoadingPlaceholder(editor, savedSelection, expectedImages);
    importing.current = true;
    announceBusy(editor, true);

    const run = async (): Promise<PasteOutcome> => {
      if (html.trim() && (files.length || hasHtmlImages)) {
        const document = new DOMParser().parseFromString(html, 'text/html');
        document.querySelectorAll('script, style').forEach((node) => node.remove());
        const images = Array.from(document.images);
        const hasTextContent = Boolean(document.body.textContent?.trim());
        const uploadedBySource = new Map<string, UploadedImage>();
        const failures: string[] = [];
        let uploadedCount = 0;

        for (let index = 0; index < images.length; index += 1) {
          const image = images[index]!;
          const source = imageSource(image);
          const clipboardFile = files[index];
          try {
            setStatus({ kind: 'uploading', message: `正在处理图片 ${index + 1}/${Math.max(images.length, files.length)}…` });
            let uploaded: UploadedImage;
            if (clipboardFile) {
              uploaded = await uploadImage(clipboardFile);
            } else if (source) {
              const existingUpload = uploadedBySource.get(source);
              uploaded = existingUpload || await uploadRemoteImage(source, image.alt.trim() || '导入图片');
              uploadedBySource.set(source, uploaded);
            } else {
              throw new Error('剪贴板只提供了本地临时地址');
            }
            markImportedImage(image, uploaded, source || uploaded.url || '');
            uploadedCount += 1;
          } catch (error) {
            failures.push(error instanceof Error ? error.message : '图片处理失败');
            replaceWithImagePlaceholder(image, index);
          }
        }

        const extraUploads: UploadedImage[] = [];
        for (let index = images.length; index < files.length; index += 1) {
          try {
            setStatus({ kind: 'uploading', message: `正在处理图片 ${index + 1}/${files.length}…` });
            extraUploads.push(await uploadImage(files[index]!));
            uploadedCount += 1;
          } catch (error) {
            failures.push(error instanceof Error ? error.message : '图片处理失败');
          }
        }

        if (!hasTextContent && uploadedCount === 0 && failures.length === 0) {
          throw new Error(failures[0] || '没有读取到可粘贴的图文内容。');
        }
        editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, document);
          const placeholder = $loadingPlaceholder(loadingPlaceholderToken);
          if (placeholder) nodes.forEach((node) => placeholder.insertBefore(node));
          else {
            restoreSelection(savedSelection);
            $insertNodes(nodes);
          }
        });
        insertUploadedImages(editor, extraUploads, null, loadingPlaceholderToken);

        if (failures.length) return partialPasteOutcome(uploadedCount, failures, hasTextContent, failures.length);
        return {
          kind: 'success',
          message: uploadedCount > 1 ? `文字和 ${uploadedCount} 张图片已粘贴。` : '文字和图片已粘贴。',
        };
      }

      if (files.length) {
        const uploaded: UploadedImage[] = [];
        const failures: string[] = [];
        for (let index = 0; index < files.length; index += 1) {
          try {
            setStatus({ kind: 'uploading', message: files.length > 1 ? `正在上传图片 ${index + 1}/${files.length}…` : '正在上传剪贴板图片…' });
            uploaded.push(await uploadImage(files[index]!));
          } catch (error) {
            failures.push(error instanceof Error ? error.message : '图片上传失败');
          }
        }
        if (markdown.trim()) insertMarkdown(editor, markdown, savedSelection, loadingPlaceholderToken);
        insertUploadedImages(editor, uploaded, markdown.trim() ? null : savedSelection, loadingPlaceholderToken);
        if (!markdown.trim() && uploaded.length === 0) throw new Error(failures[0] || '剪贴板图片上传失败。');
        if (failures.length) return partialPasteOutcome(uploaded.length, failures, Boolean(markdown.trim()));
        return {
          kind: 'success',
          message: markdown.trim()
            ? `文字和 ${uploaded.length} 张图片已粘贴。`
            : uploaded.length > 1 ? `${uploaded.length} 张图片已上传并插入。` : '图片已上传并插入当前位置。',
        };
      }

      setStatus({ kind: 'uploading', message: '正在解析 Markdown 并归档其中的图片…' });
      const response = await fetch('/api/editor/import-markdown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const result = await response.json().catch(() => ({})) as { markdown?: string; imageCount?: number; message?: string };
      if (!response.ok || !result.markdown) throw new Error(result.message || 'Markdown 导入失败。');
      insertMarkdown(editor, result.markdown, savedSelection, loadingPlaceholderToken);
      return { kind: 'success', message: `Markdown 已插入，${result.imageCount ?? 0} 张图片已归档。` };
    };

    void run().then((outcome) => setStatus(outcome)).catch((error) => {
      const detail = error instanceof Error ? error.message : '';
      setStatus({
        kind: 'error',
        message: `${detail || '图文粘贴失败。'} 请重新复制图片后再试。`,
      });
    }).finally(() => {
      removeLoadingPlaceholder(editor, loadingPlaceholderToken);
      importing.current = false;
      announceBusy(editor, false);
    });
    return true;
  }, COMMAND_PRIORITY_CRITICAL), [editor]);

  if (status.kind === 'idle' || status.kind === 'uploading') return null;
  return <p
    className={`${styles.clipboardImageStatus} ${status.kind === 'error' ? styles.clipboardImageError : status.kind === 'warning' ? styles.clipboardImageWarning : ''}`}
    role={status.kind === 'error' ? 'alert' : 'status'}
    aria-live={status.kind === 'error' ? 'assertive' : 'polite'}
  >{status.message}</p>;
}

export const PasteImageFeatureClient = createClientFeature({
  nodes: [PasteImageLoadingNode],
  plugins: [{ Component: PasteImagePlugin, position: 'belowContainer' }],
});
