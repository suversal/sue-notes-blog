'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { createClientFeature, slashMenuBasicGroupWithItems, toolbarFeatureButtonsGroupWithItems } from '@payloadcms/richtext-lexical/client';
import { $applyNodeReplacement, $createParagraphNode, $getNodeByKey, $getRoot, $getSelection, $isRangeSelection, $nodesOfType, $setSelection, COMMAND_PRIORITY_EDITOR, createCommand, DecoratorNode, HISTORIC_TAG, type DOMConversionMap, type LexicalEditor, type NodeKey, type RangeSelection, type SerializedLexicalNode } from 'lexical';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArticleVideoPlayer } from '../components/article-video-player';
import { videoFileError } from '../lib/video-file';
import { VideoServerNode, type SerializedVideoNode } from './video-node';
import { EDITOR_IMPORT_STATE_EVENT } from './paste-image-feature.client';
import styles from '../app/(studio)/articles/admin-v1.module.css';

const INSERT_VIDEO_COMMAND = createCommand<void>('INSERT_ARTICLE_VIDEO');
const CANCEL_VIDEO_UPLOAD_COMMAND = createCommand<void>('CANCEL_VIDEO_UPLOAD');
type VideoMedia = { id: string; url: string; alt: string; mimeType: string };
type UploadLoadingState = { filename: string; progress: number; storing: boolean };

function VideoUploadLoading({ filename, progress, storing }: UploadLoadingState) {
  const [editor] = useLexicalComposerContext();
  return <div className={styles.videoUploadLoading} role="status" aria-live="polite" aria-busy="true">
    <span className={styles.videoUploadSpinner} aria-hidden="true" />
    <strong>{storing ? '正在完成视频上传…' : `正在上传视频 ${progress}%`}</strong>
    <span className={styles.videoUploadFilename}>{filename}</span>
    <progress aria-label="视频上传进度" max={100} value={storing ? undefined : progress} />
    <small>上传完成后，播放器会显示在这里</small>
    <button type="button" onClick={() => editor.dispatchCommand(CANCEL_VIDEO_UPLOAD_COMMAND, undefined)}>取消上传</button>
  </div>;
}

/** Temporary UI only: replaced by the media relation before saving is enabled. */
class VideoUploadLoadingNode extends DecoratorNode<JSX.Element> {
  __uploadState: UploadLoadingState;
  static getType() { return 'video-upload-loading'; }
  static clone(node: VideoUploadLoadingNode) { return new VideoUploadLoadingNode(node.__uploadState, node.__key); }
  static importJSON(node: SerializedLexicalNode & UploadLoadingState) { return $applyNodeReplacement(new VideoUploadLoadingNode(node)); }
  constructor(state: UploadLoadingState, key?: NodeKey) { super(key); this.__uploadState = state; }
  createDOM() { return document.createElement('div'); }
  updateDOM() { return false; }
  isInline() { return false; }
  exportJSON() { return { ...super.exportJSON(), ...this.getLatest().__uploadState, type: 'video-upload-loading', version: 1 }; }
  setUploadState(state: UploadLoadingState) { this.getWritable().__uploadState = state; }
  decorate() { return <VideoUploadLoading {...this.__uploadState} />; }
}

function VideoPreview({ mediaId, nodeKey }: { mediaId: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const editable = useLexicalEditable();
  const [media, setMedia] = useState<VideoMedia>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/media/${encodeURIComponent(mediaId)}?depth=0`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json() as VideoMedia;
      if (!response.ok || !result.url || result.mimeType !== 'video/mp4') throw new Error('无法读取视频，请重试。');
      setMedia(result);
    }).catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '无法读取视频。'); });
    return () => controller.abort();
  }, [mediaId, attempt]);
  return <div className={styles.editorVideo}>
    {media ? <ArticleVideoPlayer src={media.url} title={media.alt || '文章视频'} /> : <p role={error ? 'alert' : 'status'}>{error || '正在读取视频…'}</p>}
    <div className={styles.videoActions}>
      <span>{media?.alt || '文章视频'}</span>
      {error && <button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1); }}>重新读取</button>}
      {editable && <button type="button" onClick={() => editor.update(() => { $getNodeByKey(nodeKey)?.remove(); })}>移除视频</button>}
    </div>
  </div>;
}

export class ArticleVideoNode extends VideoServerNode {
  static getType() { return 'article-video'; }
  static clone(node: ArticleVideoNode) { return new ArticleVideoNode(node.__fields, node.__id, node.__key); }
  static importJSON(node: SerializedVideoNode) {
    return $applyNodeReplacement(new ArticleVideoNode(node.fields, node.id)).updateFromJSON(node);
  }
  static importDOM(): DOMConversionMap {
    return { video: (element) => element.hasAttribute('data-article-video-id') ? {
      priority: 2,
      conversion: (element) => ({ node: $applyNodeReplacement(new ArticleVideoNode({ media: element.getAttribute('data-article-video-id')! }, globalThis.crypto.randomUUID())) }),
    } : null };
  }
  // The server base deliberately renders nothing; the editor supplies the player.
  decorate() {
    const media = this.getFields().media;
    return <VideoPreview mediaId={typeof media === 'object' ? media.id : media} nodeKey={this.getKey()} />;
  }
}

function VideoUploadPlugin() {
  const [editor] = useLexicalComposerContext();
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef<RangeSelection | null>(null);
  const uploading = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'storing' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const announce = (busy: boolean) => editor.getRootElement()?.dispatchEvent(new CustomEvent(EDITOR_IMPORT_STATE_EVENT, { bubbles: true, detail: { busy, source: 'video' } }));

  useEffect(() => editor.registerCommand(INSERT_VIDEO_COMMAND, () => {
    if (uploading.current) return true;
    editor.getEditorState().read(() => {
      const current = $getSelection();
      selection.current = $isRangeSelection(current) ? current.clone() : null;
    });
    input.current?.click();
    return true;
  }, COMMAND_PRIORITY_EDITOR), [editor]);

  useEffect(() => () => { xhrRef.current?.abort(); }, []);
  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    if (uploading.current) return;
    const hasPlaceholder = editorState.read(() => $nodesOfType(VideoUploadLoadingNode).length > 0);
    if (!hasPlaceholder) return;
    // History restores can bypass node transforms. Never retain an inactive loading card.
    queueMicrotask(() => {
      if (!uploading.current) editor.update(() => {
        $nodesOfType(VideoUploadLoadingNode).forEach((node) => node.remove());
      }, { tag: HISTORIC_TAG });
    });
  }), [editor]);
  useEffect(() => editor.registerCommand(CANCEL_VIDEO_UPLOAD_COMMAND, () => {
    xhrRef.current?.abort();
    return true;
  }, COMMAND_PRIORITY_EDITOR), [editor]);

  const upload = (file: File) => {
    if (uploading.current) return;
    const error = videoFileError(file);
    if (error) { setRetryFile(null); setStatus('error'); setMessage(error); return; }
    uploading.current = true;
    setRetryFile(file);
    announce(true);
    setStatus('uploading');
    setMessage(`正在上传 ${file.name}…`);
    let placeholderKey: NodeKey | undefined;
    editor.update(() => {
      const saved = selection.current;
      if (saved && $getNodeByKey(saved.anchor.key)?.isAttached() && $getNodeByKey(saved.focus.key)?.isAttached()) $setSelection(saved.clone());
      else $getRoot().selectEnd();
      const placeholder = $applyNodeReplacement(new VideoUploadLoadingNode({ filename: file.name, progress: 0, storing: false }));
      placeholderKey = placeholder.getKey();
      $insertNodeToNearestRoot(placeholder);
    }, { onUpdate: () => {
      if (placeholderKey) editor.getElementByKey(placeholderKey)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } });
    const updatePlaceholder = (progress: number, storing: boolean) => editor.update(() => {
      const placeholder = placeholderKey ? $getNodeByKey(placeholderKey) : null;
      if (placeholder instanceof VideoUploadLoadingNode) placeholder.setUploadState({ filename: file.name, progress, storing });
    });
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const finish = () => { uploading.current = false; xhrRef.current = null; announce(false); };
    const removePlaceholder = () => editor.update(() => { if (placeholderKey) $getNodeByKey(placeholderKey)?.remove(); });
    const fail = (message: string) => { removePlaceholder(); setStatus('error'); setMessage(message); finish(); };
    xhr.open('POST', '/api/editor/videos');
    xhr.timeout = 300_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round(event.loaded / event.total * 100);
        updatePlaceholder(progress, false);
      }
    };
    xhr.upload.onload = () => { updatePlaceholder(100, true); setStatus('storing'); setMessage('正在完成视频上传…'); };
    xhr.onerror = () => fail('网络异常，视频上传失败，请重试。');
    xhr.ontimeout = () => fail('视频上传超时，请重试。');
    xhr.onabort = () => { removePlaceholder(); setStatus('idle'); setMessage('已取消视频上传。'); finish(); };
    xhr.onload = () => {
      let result: Partial<VideoMedia> & { message?: string };
      try { result = JSON.parse(xhr.responseText); } catch { fail('视频上传失败，请重试。'); return; }
      if (xhr.status < 200 || xhr.status >= 300 || !result.id || !result.url) { fail(result.message || '视频上传失败，请重试。'); return; }
      try {
        editor.update(() => {
          const video = $applyNodeReplacement(new ArticleVideoNode({ media: result.id! }, globalThis.crypto.randomUUID()));
          const placeholder = placeholderKey ? $getNodeByKey(placeholderKey) : null;
          if (placeholder?.isAttached()) placeholder.replace(video);
          else { $getRoot().selectEnd(); $insertNodeToNearestRoot(video); }
          const paragraph = $createParagraphNode();
          video.insertAfter(paragraph);
          paragraph.select();
        }, { onUpdate: () => {
          setRetryFile(null);
          setStatus('success');
          setMessage('视频已插入正文，可以预览播放。');
          finish();
          queueMicrotask(() => editor.focus());
        } });
      } catch {
        fail('视频已上传，但插入正文失败，请重试。');
      }
    };
    const form = new FormData();
    form.set('file', file);
    xhr.send(form);
  };

  const busy = status === 'uploading' || status === 'storing';
  return <>
    <input ref={input} type="file" accept="video/mp4,.mp4" aria-label="选择 MP4 视频" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) upload(file);
    }} />
    {status !== 'idle' && !busy && <div className={styles.videoUploadStatus} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span>{message}</span>
      {status === 'error' && retryFile && <button type="button" onClick={() => upload(retryFile)}>重试上传</button>}
    </div>}
  </>;
}

function VideoIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 8 6 4-6 4Z" /></svg>;
}

const insertVideo = { key: 'insertVideo', label: '插入视频', ChildComponent: VideoIcon, onSelect: ({ editor }: { editor: LexicalEditor }) => { editor.dispatchCommand(INSERT_VIDEO_COMMAND, undefined); } };

export const VideoFeatureClient = createClientFeature({
  nodes: [ArticleVideoNode, VideoUploadLoadingNode],
  plugins: [{ Component: VideoUploadPlugin, position: 'belowContainer' }],
  toolbarFixed: { groups: [toolbarFeatureButtonsGroupWithItems([insertVideo])] },
  slashMenu: { groups: [slashMenuBasicGroupWithItems([{
    key: 'insertVideo',
    label: '插入视频',
    Icon: VideoIcon,
    keywords: ['video', 'mp4', '视频'],
    onSelect: insertVideo.onSelect,
  }])] },
});
