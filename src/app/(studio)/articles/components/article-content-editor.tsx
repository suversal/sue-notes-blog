'use client';

import { RenderLexical } from '@payloadcms/richtext-lexical/client';
import { useEffect, useRef } from 'react';
import type { ArticleContent } from '../../../../lib/article-content-data';
import { EDITOR_IMAGE_LAYOUT_EVENT } from '../../../../lexical/editor-ux-feature.client';
import { EDITOR_IMPORT_STATE_EVENT } from '../../../../lexical/paste-image-feature.client';
import styles from '../admin-v1.module.css';

const EDITOR_CONTROL_LABELS = [
  ['[data-dropdown-key="text"]', '段落、标题与列表'],
  ['[data-dropdown-key="align"]', '文字对齐'],
  ['[data-button-key="indentDecrease"]', '减少缩进'],
  ['[data-button-key="indentIncrease"]', '增加缩进'],
  ['[data-button-key="bold"]', '粗体'],
  ['[data-button-key="italic"]', '斜体'],
  ['[data-button-key="underline"]', '下划线'],
  ['[data-button-key="strikethrough"]', '删除线'],
  ['[data-button-key="subscript"]', '下标'],
  ['[data-button-key="superscript"]', '上标'],
  ['[data-button-key="inlineCode"]', '行内代码'],
  ['[data-button-key="codeBlock"]', '代码块'],
  ['[data-button-key="tableDirect"]', '插入表格'],
  ['[data-button-key="horizontalRuleDirect"]', '分隔线'],
  ['[data-button-key="quoteToolbar"]', '引用'],
  ['.draggable-block-menu', '拖动调整段落位置'],
  ['.add-block-menu', '在此处新增内容块'],
  ['.insert-paragraph-at-end', '在末尾新增段落'],
  ['.link-edit', '编辑链接'],
  ['.link-trash', '移除链接'],
  ['.LexicalEditorTheme__upload__swap-drawer-toggler', '调整图片尺寸'],
  ['.LexicalEditorTheme__upload__removeButton', '移除图片'],
] as const;

function labelEditorControls(root: HTMLElement) {
  for (const [selector, label] of EDITOR_CONTROL_LABELS) {
    root.querySelectorAll<HTMLElement>(selector).forEach((control) => {
      control.setAttribute('aria-label', label);
      control.setAttribute('title', label);
    });
  }

  root.querySelectorAll<HTMLElement>('.LexicalEditorTheme__upload__doc-drawer-toggler').forEach((control) => {
    const filename = control.textContent?.trim() || '图片';
    control.setAttribute('aria-disabled', 'true');
    control.setAttribute('aria-label', `图片文件名：${filename}`);
    control.setAttribute('title', `图片文件名：${filename}`);
    control.setAttribute('tabindex', '-1');
    if (control instanceof HTMLButtonElement) control.disabled = true;
  });
}

export function ArticleContentEditor({ value, onChange, onImportStateChange }: { value: ArticleContent; onChange: (value: ArticleContent) => void; onImportStateChange?: (busy: boolean) => void }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element || !onImportStateChange) return;
    const listener = (event: Event) => onImportStateChange(Boolean((event as CustomEvent<{ busy?: boolean }>).detail?.busy));
    element.addEventListener(EDITOR_IMPORT_STATE_EVENT, listener);
    return () => element.removeEventListener(EDITOR_IMPORT_STATE_EVENT, listener);
  }, [onImportStateChange]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{
        layout: null | {
          displayAlignment: 'left' | 'center' | 'right';
          displayHeight?: number;
          displayScale: 25 | 50 | 75 | 100 | 'custom';
          displayWidth?: number;
        };
        nodeID: string;
      }>).detail;
      if (!detail?.nodeID) return;
      const next = structuredClone(value) as ArticleContent;
      const visit = (node: {
        children?: unknown[];
        fields?: Record<string, unknown>;
        id?: unknown;
        type?: string;
      }): boolean => {
        if (node.type === 'upload' && String(node.id) === detail.nodeID) {
          const fields = node.fields ?? {};
          const {
            displayAlignment: _alignment,
            displayHeight: _height,
            displayRatio: _legacyRatio,
            displayScale: _scale,
            displayWidth: _width,
            ...otherFields
          } = fields;
          node.fields = detail.layout ? { ...otherFields, ...detail.layout } : otherFields;
          return true;
        }
        return (node.children ?? []).some((child) => child && typeof child === 'object' && visit(child as typeof node));
      };
      if (visit(next.root as unknown as Parameters<typeof visit>[0])) onChange(next);
    };
    element.addEventListener(EDITOR_IMAGE_LAYOUT_EVENT, listener);
    return () => element.removeEventListener(EDITOR_IMAGE_LAYOUT_EVENT, listener);
  }, [onChange, value]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const unsupportedImageAction = '.LexicalEditorTheme__upload__doc-drawer-toggler';
    const preventUnsupportedImageAction = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(unsupportedImageAction)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const preventUnsupportedImageKeyboardAction = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') preventUnsupportedImageAction(event);
    };
    const updateLabels = () => labelEditorControls(element);
    updateLabels();
    const observer = new MutationObserver(updateLabels);
    observer.observe(element, { childList: true, subtree: true });
    element.addEventListener('click', preventUnsupportedImageAction, true);
    element.addEventListener('keydown', preventUnsupportedImageKeyboardAction, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('click', preventUnsupportedImageAction, true);
      element.removeEventListener('keydown', preventUnsupportedImageKeyboardAction, true);
    };
  }, []);

  return (
    <div ref={container} className={styles.lexicalEditor}>
      <RenderLexical
        field={{ name: 'content', label: '正文' }}
        path="content"
        schemaPath="collection.articles.content"
        value={value}
        setValue={(next) => { if (next) onChange(next as ArticleContent); }}
        Loading={<p className={styles.editorLoading} role="status">正在加载编辑器…</p>}
      />
    </div>
  );
}
