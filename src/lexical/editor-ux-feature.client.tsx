'use client';

import { $createQuoteNode, $isQuoteNode } from '@payloadcms/richtext-lexical/lexical/rich-text';
import { $setBlocksType } from '@payloadcms/richtext-lexical/lexical/selection';
import { $createCodeNode, $isCodeNode, CodeHighlightNode, CodeNode } from '@lexical/code';
import { CODE } from '@lexical/markdown';
import { $findMatchingParent, $insertNodeToNearestRoot } from '@lexical/utils';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  $createLinkNode,
  $createHorizontalRuleNode,
  $isLinkNode,
  $isUploadNode,
  createClientFeature,
  getSelectedNode,
  toolbarFeatureButtonsGroupWithItems,
  TOGGLE_LINK_COMMAND,
  UploadNode,
} from '@payloadcms/richtext-lexical/client';
import {
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $nodesOfType,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
} from 'lexical';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

type ToolbarItem = Parameters<typeof toolbarFeatureButtonsGroupWithItems>[0][number];
type ToolbarComponentProps = Parameters<NonNullable<ToolbarItem['Component']>>[0];
export const EDITOR_IMAGE_LAYOUT_EVENT = 'knowhub:editor-image-layout';

type ImageLayoutScale = 25 | 50 | 75 | 100 | 'custom';
type ImageLayoutAlignment = 'left' | 'center' | 'right';
type ImageLayoutFields = Record<string, unknown> & {
  displayAlignment?: ImageLayoutAlignment;
  displayHeight?: number;
  displayScale?: ImageLayoutScale;
  displayWidth?: number;
};

const IMAGE_LAYOUT_SCALES = [25, 50, 75, 100] as const;
const IMAGE_LAYOUT_ALIGNMENTS: Array<{ label: string; value: ImageLayoutAlignment }> = [
  { label: '靠左', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '靠右', value: 'right' },
];
const MIN_IMAGE_SIZE = 80;
const MAX_IMAGE_SIZE = 4096;

function clampImageSize(value: number) {
  return Math.max(MIN_IMAGE_SIZE, Math.min(MAX_IMAGE_SIZE, Math.round(value)));
}

function safeLayoutFields(value: unknown): ImageLayoutFields {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ImageLayoutFields : {};
}

function readPositiveSize(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? clampImageSize(value) : null;
}

function readImageLayoutScale(value: unknown, width: number | null): ImageLayoutScale {
  if (value === 'custom') return 'custom';
  if (IMAGE_LAYOUT_SCALES.includes(value as (typeof IMAGE_LAYOUT_SCALES)[number])) {
    return value as (typeof IMAGE_LAYOUT_SCALES)[number];
  }
  return width ? 'custom' : 100;
}

function readImageLayoutAlignment(value: unknown): ImageLayoutAlignment {
  return value === 'left' || value === 'right' ? value : 'center';
}

function applyImageLayoutToDOM(editor: LexicalEditor) {
  editor.getEditorState().read(() => {
    for (const node of $nodesOfType(UploadNode)) {
      const element = editor.getElementByKey(node.getKey());
      if (!(element instanceof HTMLElement)) continue;
      const fields = safeLayoutFields(node.getData().fields);
      const width = readPositiveSize(fields.displayWidth);
      const height = readPositiveSize(fields.displayHeight);
      const hasLayout = fields.displayScale !== undefined || Boolean(width);
      const scale = readImageLayoutScale(fields.displayScale, width);
      const alignment = readImageLayoutAlignment(fields.displayAlignment);
      const usesCustomSize = hasLayout && scale === 'custom' && Boolean(width);
      const media = element.querySelector<HTMLElement>('.LexicalEditorTheme__upload__media');

      element.style.width = !hasLayout ? '' : usesCustomSize ? `${width}px` : `${scale}%`;
      element.style.maxWidth = '100%';
      element.style.marginLeft = alignment === 'left' ? '0' : 'auto';
      element.style.marginRight = alignment === 'right' ? '0' : 'auto';
      element.dataset.imageAlignment = alignment;
      element.toggleAttribute('data-image-layout', hasLayout);
      element.toggleAttribute('data-image-custom', Boolean(usesCustomSize && height));
      element.removeAttribute('data-image-crop');
      if (!media) continue;

      if (usesCustomSize && width && height) {
        media.style.aspectRatio = `${width} / ${height}`;
        media.style.width = '100%';
      } else {
        media.style.aspectRatio = '';
        media.style.width = '';
      }
    }
  });
}

function QuoteIcon() {
  return (
    <svg aria-hidden="true" className="icon" focusable="false" height="20" viewBox="0 0 20 20" width="20">
      <path d="M3.25 5.5h5v5.25c0 2.25-1.1 3.75-3.25 4.5l-.75-1.45c1.2-.5 1.8-1.2 1.9-2.05h-2.9V5.5Zm8.5 0h5v5.25c0 2.25-1.1 3.75-3.25 4.5l-.75-1.45c1.2-.5 1.8-1.2 1.9-2.05h-2.9V5.5Z" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" className="icon" focusable="false" height="20" viewBox="0 0 20 20" width="20">
      <path d="m8 12 4-4M6.4 13.6l-1 .95a3.15 3.15 0 0 1-4.45-4.45L4.1 6.95A3.15 3.15 0 0 1 8.55 7M13.6 6.4l1-.95a3.15 3.15 0 1 1 4.45 4.45l-3.15 3.15a3.15 3.15 0 0 1-4.45-.05" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function CodeBlockIcon() {
  return (
    <svg aria-hidden="true" className="icon" focusable="false" height="20" viewBox="0 0 20 20" width="20">
      <path d="m7 5-4.5 5L7 15M13 5l4.5 5-4.5 5M11.5 3.5l-3 13" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg aria-hidden="true" className="icon" focusable="false" height="20" viewBox="0 0 20 20" width="20">
      <rect fill="none" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" width="16" x="2" y="3" />
      <path d="M2 8h16M7.33 3v14M12.67 3v14" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function DividerIcon() {
  return (
    <svg aria-hidden="true" className="icon" focusable="false" height="20" viewBox="0 0 20 20" width="20">
      <path d="M2.5 10h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="m8 6 2-2 2 2M8 14l2 2 2-2" fill="none" opacity=".65" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
    </svg>
  );
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(?:\/|#)/.test(trimmed)) return trimmed;
  if (/^(?:mailto|tel):[^\s]+$/i.test(trimmed)) return trimmed;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

function restoreSelection(editor: LexicalEditor, selection: RangeSelection | null) {
  editor.update(() => {
    if (selection) $setSelection(selection);
  });
}

function getSelectedLink(selection: RangeSelection) {
  const selectedNode = getSelectedNode(selection);
  return $isLinkNode(selectedNode) ? selectedNode : $findMatchingParent(selectedNode, $isLinkNode);
}

function SimpleLinkControl({ active = false, editor, enabled = true }: ToolbarComponentProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLFormElement>(null);
  const selectionRef = useRef<RangeSelection | null>(null);
  const selectedNodesRef = useRef<LexicalNode[]>([]);
  const selectedTextRef = useRef('');
  const [open, setOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [url, setUrl] = useState('https://');
  const [newTab, setNewTab] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ left: 12, top: 72, width: 360 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      setPosition({ left, top: rect.bottom + 8, width });
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsidePress, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const showEditor = () => {
    if (!enabled) return;
    let currentUrl = 'https://';
    let currentNewTab = true;
    let currentText = '';
    let hasSelectedLink = false;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selectionRef.current = selection.clone();
      selectedNodesRef.current = selection.getNodes();
      selectedTextRef.current = selection.getTextContent();
      currentText = selectedTextRef.current;
      const link = getSelectedLink(selection);
      if (link) {
        hasSelectedLink = true;
        const fields = link.getFields();
        if (fields?.url) currentUrl = String(fields.url);
        currentNewTab = Boolean(fields?.newTab);
        currentText = link.getTextContent();
      }
    });
    setLinkText(currentText);
    setUrl(currentUrl);
    setNewTab(currentNewTab);
    setEditing(hasSelectedLink);
    setError('');
    setOpen(true);
  };

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('请输入有效的网址、站内路径、邮箱或电话号码。');
      return;
    }
    const fields = { doc: null, linkType: 'custom' as const, newTab, url: normalized };
    const displayText = linkText.trim() || selectedTextRef.current.trim() || normalized;
    if (!selectedTextRef.current.trim()) {
      editor.update(() => {
        if (selectionRef.current) $setSelection(selectionRef.current);
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const link = $createLinkNode({ fields });
        link.append($createTextNode(displayText));
        selection.insertNodes([link]);
        link.selectEnd();
      });
    } else {
      restoreSelection(editor, selectionRef.current);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
        fields,
        selectedNodes: selectedNodesRef.current,
        text: displayText,
      });
    }
    setOpen(false);
    editor.focus();
  };

  const removeLink = () => {
    restoreSelection(editor, selectionRef.current);
    editor.focus(() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null));
    setOpen(false);
  };

  return (
    <div className="sue-link-control">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="插入或编辑链接"
        className={`toolbar-popup__button toolbar-popup__button-simpleLink${active ? ' active' : ''}${enabled ? '' : ' disabled'}`}
        data-button-key="simpleLink"
        disabled={!enabled}
        onClick={showEditor}
        onMouseDown={(event) => event.preventDefault()}
        ref={buttonRef}
        title="插入或编辑链接"
        type="button"
      >
        <LinkIcon />
      </button>
      {open && createPortal(
        <form
          aria-label="链接设置"
          className="sue-link-popover"
          onSubmit={applyLink}
          ref={popoverRef}
          role="dialog"
          style={position}
        >
          <label htmlFor="sue-editor-link-text">链接文字</label>
          <input
            id="sue-editor-link-text"
            onChange={(event) => setLinkText(event.target.value)}
            placeholder="例如：查看原文"
            value={linkText}
          />
          <label htmlFor="sue-editor-link-url">链接地址</label>
          <input
            autoFocus
            id="sue-editor-link-url"
            onChange={(event) => { setUrl(event.target.value); setError(''); }}
            placeholder="https://example.com"
            spellCheck={false}
            value={url}
          />
          {error ? <p className="sue-link-popover__error" role="alert">{error}</p> : null}
          <label className="sue-link-popover__checkbox">
            <input checked={newTab} onChange={(event) => setNewTab(event.target.checked)} type="checkbox" />
            在新窗口打开
          </label>
          <div className="sue-link-popover__actions">
            {editing ? <button className="sue-link-popover__remove" onClick={removeLink} type="button">移除链接</button> : <span />}
            <button className="sue-link-popover__apply" type="submit">应用链接</button>
          </div>
        </form>,
        document.body,
      )}
    </div>
  );
}

function TableControl({ editor, enabled = true }: ToolbarComponentProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLFormElement>(null);
  const selectionRef = useRef<RangeSelection | null>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [position, setPosition] = useState({ left: 12, top: 72, width: 300 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(300, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      setPosition({ left, top: rect.bottom + 8, width });
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsidePress, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const showEditor = () => {
    if (!enabled) return;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      selectionRef.current = $isRangeSelection(selection) ? selection.clone() : null;
    });
    setOpen(true);
  };

  const insertTable = (event: FormEvent) => {
    event.preventDefault();
    const safeRows = Math.max(1, Math.min(12, Math.round(rows)));
    const safeColumns = Math.max(1, Math.min(8, Math.round(columns)));
    editor.update(() => {
      if (selectionRef.current) $setSelection(selectionRef.current);
      editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: String(safeColumns), rows: String(safeRows) });
    });
    setOpen(false);
    editor.focus();
  };

  return (
    <div className="sue-table-control">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="插入表格"
        className={`toolbar-popup__button toolbar-popup__button-tableDirect${enabled ? '' : ' disabled'}`}
        data-button-key="tableDirect"
        disabled={!enabled}
        onClick={showEditor}
        onMouseDown={(event) => event.preventDefault()}
        ref={buttonRef}
        title="插入表格"
        type="button"
      >
        <TableIcon />
      </button>
      {open && createPortal(
        <form aria-label="表格设置" className="sue-table-popover" onSubmit={insertTable} ref={popoverRef} role="dialog" style={position}>
          <p>插入表格</p>
          <div className="sue-table-popover__fields">
            <label htmlFor="sue-editor-table-rows">行数
              <input id="sue-editor-table-rows" max="12" min="1" onChange={(event) => setRows(event.target.valueAsNumber || 1)} type="number" value={rows} />
            </label>
            <label htmlFor="sue-editor-table-columns">列数
              <input id="sue-editor-table-columns" max="8" min="1" onChange={(event) => setColumns(event.target.valueAsNumber || 1)} type="number" value={columns} />
            </label>
          </div>
          <p className="sue-table-popover__hint">最多 12 行、8 列，插入后可从单元格菜单增删行列。</p>
          <button className="sue-table-popover__apply" type="submit">插入</button>
        </form>,
        document.body,
      )}
    </div>
  );
}

function ImageLayoutPlugin() {
  const [editor] = useLexicalComposerContext();
  const triggerRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [nodeKey, setNodeKey] = useState<NodeKey | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [scale, setScale] = useState<ImageLayoutScale>(100);
  const [alignment, setAlignment] = useState<ImageLayoutAlignment>('center');
  const [position, setPosition] = useState({ left: 12, top: 72, width: 360 });

  useEffect(() => {
    let frame = 0;
    const scheduleLayoutSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyImageLayoutToDOM(editor));
    };
    const openLayoutEditor = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>('.LexicalEditorTheme__upload__swap-drawer-toggler');
      if (!trigger) return;
      const upload = trigger.closest<HTMLElement>('.LexicalEditorTheme__upload');
      if (!upload) return;

      event.preventDefault();
      event.stopPropagation();
      let selectedKey: NodeKey | null = null;
      let fields: ImageLayoutFields = {};
      editor.read(() => {
        const node = $getNearestNodeFromDOMNode(upload);
        if (!$isUploadNode(node)) return;
        selectedKey = node.getKey();
        fields = safeLayoutFields(node.getData().fields);
      });
      if (!selectedKey) return;

      const image = upload.querySelector<HTMLImageElement>('img');
      const naturalWidth = clampImageSize(image?.naturalWidth || image?.width || 800);
      const naturalHeight = clampImageSize(image?.naturalHeight || image?.height || 600);
      const nextWidth = readPositiveSize(fields.displayWidth) || naturalWidth;
      const nextHeight = readPositiveSize(fields.displayHeight) || naturalHeight;
      const nextScale = readImageLayoutScale(fields.displayScale, readPositiveSize(fields.displayWidth));

      triggerRef.current = trigger;
      setNodeKey(selectedKey);
      setScale(nextScale);
      setAlignment(readImageLayoutAlignment(fields.displayAlignment));
      setWidth(nextWidth);
      setHeight(nextHeight);
      setOpen(true);
    };

    const unregisterRoot = editor.registerRootListener((root, previousRoot) => {
      previousRoot?.removeEventListener('click', openLayoutEditor, true);
      root?.addEventListener('click', openLayoutEditor, true);
      scheduleLayoutSync();
    });
    const unregisterUpdate = editor.registerUpdateListener(scheduleLayoutSync);
    scheduleLayoutSync();
    return () => {
      cancelAnimationFrame(frame);
      unregisterRoot();
      unregisterUpdate();
    };
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(360, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12));
      const panelHeight = popoverRef.current?.getBoundingClientRect().height || 330;
      const below = rect.bottom + 8;
      const top = below + panelHeight <= window.innerHeight - 12
        ? below
        : Math.max(12, rect.top - panelHeight - 8);
      setPosition({ left, top, width: panelWidth });
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    document.addEventListener('pointerdown', closeOnOutsidePress, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const writeLayout = (reset: boolean) => {
    if (!nodeKey) return;
    let nodeID = '';
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isUploadNode(node)) return;
      const data = node.getData();
      nodeID = String(data.id);
      const currentFields = safeLayoutFields(data.fields);
      const {
        displayAlignment: _alignment,
        displayHeight: _height,
        displayRatio: _legacyRatio,
        displayScale: _scale,
        displayWidth: _width,
        ...otherFields
      } = currentFields;
      const layoutFields = scale === 'custom'
        ? {
            displayAlignment: alignment,
            displayHeight: clampImageSize(height),
            displayScale: scale,
            displayWidth: clampImageSize(width),
          }
        : { displayAlignment: alignment, displayScale: scale };
      node.setData({
        ...data,
        fields: reset ? otherFields : { ...otherFields, ...layoutFields },
      });
    });
    if (nodeID) {
      editor.getRootElement()?.dispatchEvent(new CustomEvent(EDITOR_IMAGE_LAYOUT_EVENT, {
        bubbles: true,
        detail: {
          layout: reset ? null : scale === 'custom'
            ? {
                displayAlignment: alignment,
                displayHeight: clampImageSize(height),
                displayScale: scale,
                displayWidth: clampImageSize(width),
              }
            : { displayAlignment: alignment, displayScale: scale },
          nodeID,
        },
      }));
    }
    setOpen(false);
    editor.focus();
  };

  if (!open) return null;

  return createPortal(
    <form
      aria-label="图片尺寸与对齐"
      className="sue-image-layout-popover"
      onSubmit={(event) => { event.preventDefault(); writeLayout(false); }}
      ref={popoverRef}
      role="dialog"
      style={position}
    >
      <header>
        <strong>调整图片尺寸与对齐</strong>
        <button aria-label="关闭图片尺寸设置" onClick={() => setOpen(false)} title="关闭" type="button">×</button>
      </header>
      <fieldset className="sue-image-layout-popover__scale">
        <legend>显示宽度</legend>
        <div aria-label="图片显示宽度" role="group">
          {IMAGE_LAYOUT_SCALES.map((option) => (
            <button
              aria-pressed={scale === option}
              key={option}
              onClick={() => setScale(option)}
              type="button"
            >
              {option}%
            </button>
          ))}
          <button aria-pressed={scale === 'custom'} onClick={() => setScale('custom')} type="button">自定义</button>
        </div>
      </fieldset>
      <fieldset className="sue-image-layout-popover__alignment">
        <legend>图片对齐</legend>
        <div aria-label="图片对齐方式" role="group">
          {IMAGE_LAYOUT_ALIGNMENTS.map((option) => (
            <button
              aria-pressed={alignment === option.value}
              key={option.value}
              onClick={() => setAlignment(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sue-image-layout-popover__fields">
        <label htmlFor="sue-image-layout-width">宽度（px）
          <input disabled={scale !== 'custom'} id="sue-image-layout-width" max={MAX_IMAGE_SIZE} min={MIN_IMAGE_SIZE} onChange={(event) => setWidth(clampImageSize(event.target.valueAsNumber || MIN_IMAGE_SIZE))} type="number" value={width} />
        </label>
        <label htmlFor="sue-image-layout-height">高度（px）
          <input disabled={scale !== 'custom'} id="sue-image-layout-height" max={MAX_IMAGE_SIZE} min={MIN_IMAGE_SIZE} onChange={(event) => setHeight(clampImageSize(event.target.valueAsNumber || MIN_IMAGE_SIZE))} type="number" value={height} />
        </label>
      </div>
      <p>百分比按正文可用宽度计算，并始终保持原图比例；需要精确尺寸时选择“自定义”。窄屏会自动缩小。</p>
      <footer>
        <button className="sue-image-layout-popover__reset" onClick={() => writeLayout(true)} type="button">恢复默认</button>
        <button className="sue-image-layout-popover__apply" type="submit">应用尺寸</button>
      </footer>
    </form>,
    document.body,
  );
}

const toolbarGroup = toolbarFeatureButtonsGroupWithItems([
  {
    ChildComponent: QuoteIcon,
    isActive: ({ selection }) => $isRangeSelection(selection)
      && selection.getNodes().every((node) => $isQuoteNode(node) || $isQuoteNode(node.getParent())),
    key: 'quoteToolbar',
    label: '引用',
    onSelect: ({ editor, isActive }) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => isActive ? $createParagraphNode() : $createQuoteNode());
      });
    },
    order: 10,
  },
  {
    ChildComponent: CodeBlockIcon,
    key: 'codeBlock',
    label: '代码块',
    isActive: ({ selection }) => $isRangeSelection(selection)
      && selection.getNodes().every((node) => $isCodeNode(node) || $isCodeNode(node.getParent())),
    onSelect: ({ editor, isActive }) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => isActive ? $createParagraphNode() : $createCodeNode());
      });
    },
    order: 20,
  },
  {
    Component: TableControl,
    key: 'tableDirect',
    label: '插入表格',
    order: 30,
  },
  {
    ChildComponent: DividerIcon,
    key: 'horizontalRuleDirect',
    label: '分隔线',
    onSelect: ({ editor }) => {
      editor.update(() => {
        const rule = $createHorizontalRuleNode();
        $insertNodeToNearestRoot(rule);
        const paragraph = $createParagraphNode();
        rule.insertAfter(paragraph);
        paragraph.select();
      });
    },
    order: 35,
  },
  {
    Component: SimpleLinkControl,
    isActive: ({ selection }) => $isRangeSelection(selection)
      && Boolean(getSelectedLink(selection)),
    isEnabled: ({ selection }) => $isRangeSelection(selection),
    key: 'simpleLink',
    label: '插入链接',
    order: 45,
  },
]);

export const EditorUxFeatureClient = createClientFeature({
  markdownTransformers: [CODE],
  nodes: [CodeNode, CodeHighlightNode],
  plugins: [{ Component: ImageLayoutPlugin, position: 'normal' }],
  toolbarFixed: { groups: [toolbarGroup] },
});
