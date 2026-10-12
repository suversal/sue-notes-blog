'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { findMarkdownImageSources } from '../../../../lib/article-import';
import { inspectObsidianFolder, normalizeObsidianAttachmentSource, pathInsideSelectedFolder } from '../../../../lib/obsidian-folder';
import { Icon } from '../../../(site)/blog/components/ui-icon';
import styles from './import.module.css';

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_MARKDOWN_SIZE = 2 * 1024 * 1024;

type ImportMode = 'folder' | 'zip';
type ImportResult = { articleId?: string; message?: string };
type ImportProgress = { current: number; fileName: string; phase: 'checking' | 'uploading'; total: number };
type FolderSelection = {
  attachmentDirectories: string[];
  imageFiles: File[];
  markdownFiles: File[];
  rootName: string;
};

export function ObsidianImportForm() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ImportMode>('folder');
  const [folder, setFolder] = useState<FolderSelection>();
  const [selectedMarkdownPaths, setSelectedMarkdownPaths] = useState<string[]>([]);
  const [archive, setArchive] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTitle, setMessageTitle] = useState('无法导入');
  const [progress, setProgress] = useState<ImportProgress>();

  useEffect(() => {
    if (message) errorRef.current?.focus();
  }, [message]);

  const switchMode = (nextMode: ImportMode) => {
    if (busy) return;
    setMode(nextMode);
    setMessage('');
    setMessageTitle('无法导入');
  };

  const chooseFolder = (fileList: FileList | null) => {
    setMessage('');
    setMessageTitle('无法导入');
    setFolder(undefined);
    setSelectedMarkdownPaths([]);
    if (!fileList?.length) return;
    try {
      const inspected = inspectObsidianFolder([...fileList]);
      if (!inspected.markdownFiles.length) {
        setMessage('所选目录第一层没有找到 Markdown 文件。');
        return;
      }
      setFolder(inspected);
      if (inspected.markdownFiles.length === 1) {
        setSelectedMarkdownPaths([inspected.markdownFiles[0]!.webkitRelativePath]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取所选目录。');
    }
  };

  const chooseArchive = (file?: File) => {
    setMessage('');
    setMessageTitle('无法导入');
    if (!file) return setArchive(undefined);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setArchive(undefined);
      return setMessage('请选择 ZIP 格式的文章包。');
    }
    if (file.size > MAX_ARCHIVE_SIZE) {
      setArchive(undefined);
      return setMessage('ZIP 不能超过 50 MB。');
    }
    setArchive(file);
  };

  const selectedMarkdownFiles = folder?.markdownFiles.filter((file) => selectedMarkdownPaths.includes(file.webkitRelativePath)) ?? [];
  const ready = mode === 'folder' ? selectedMarkdownFiles.length > 0 : Boolean(archive);

  const toggleMarkdown = (relativePath: string) => {
    setSelectedMarkdownPaths((current) => current.includes(relativePath)
      ? current.filter((path) => path !== relativePath)
      : [...current, relativePath]);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || busy) {
      if (!ready) {
        setMessageTitle('无法导入');
        setMessage(mode === 'folder' ? '请至少选择一篇文章。' : '请先选择一个 ZIP 文章包。');
      }
      return;
    }

    setBusy(true);
    setMessage('');
    setMessageTitle('无法导入');
    try {
      if (mode === 'folder' && folder) {
        const availableImages = new Map(folder.imageFiles.map((file) => [pathInsideSelectedFolder(file.webkitRelativePath), file]));
        const plans: { data: FormData; file: File }[] = [];

        for (const [index, markdown] of selectedMarkdownFiles.entries()) {
          setProgress({ current: index + 1, fileName: markdown.name, phase: 'checking', total: selectedMarkdownFiles.length });
          if (markdown.size > MAX_MARKDOWN_SIZE) throw new Error(`“${markdown.name}”超过 2 MB。`);
          const referencedPaths = new Set(findMarkdownImageSources(await markdown.text())
            .map(normalizeObsidianAttachmentSource)
            .filter((source): source is string => Boolean(source)));
          const missingImages = [...referencedPaths].filter((source) => !availableImages.has(source));
          if (missingImages.length) throw new Error(`“${markdown.name}”引用的图片未在所选目录中找到：${missingImages[0]}`);

          const data = new FormData();
          data.set('source', 'files');
          data.set('markdown', markdown);
          data.set('markdownPath', pathInsideSelectedFolder(markdown.webkitRelativePath));
          for (const source of referencedPaths) {
            data.append('asset', availableImages.get(source)!);
            data.append('assetPath', source);
          }
          plans.push({ data, file: markdown });
        }

        const succeeded: { articleId: string; path: string }[] = [];
        const failed: { message: string; path: string }[] = [];
        for (const [index, plan] of plans.entries()) {
          setProgress({ current: index + 1, fileName: plan.file.name, phase: 'uploading', total: plans.length });
          try {
            const response = await fetch('/api/editor/import-obsidian', { method: 'POST', body: plan.data });
            const result = await response.json().catch(() => ({})) as ImportResult;
            if (!response.ok || !result.articleId) throw new Error(result.message || '文章导入失败。');
            succeeded.push({ articleId: result.articleId, path: plan.file.webkitRelativePath });
          } catch (error) {
            failed.push({
              message: error instanceof Error ? error.message : '文章导入失败。',
              path: plan.file.webkitRelativePath,
            });
          }
        }

        if (failed.length) {
          setSelectedMarkdownPaths(failed.map((item) => item.path));
          setMessageTitle(succeeded.length ? '部分文章导入失败' : '无法导入');
          setMessage(`${succeeded.length ? `已成功导入 ${succeeded.length} 篇；` : ''}${failed.length} 篇失败，失败项已保留供重试。第一项：${failed[0]!.message}`);
          router.refresh();
          return;
        }
        if (succeeded.length === 1) router.push(`/articles/${encodeURIComponent(succeeded[0]!.articleId)}`);
        else router.push(`/articles?notice=imported&count=${succeeded.length}`);
      } else if (archive) {
        setProgress({ current: 1, fileName: archive.name, phase: 'uploading', total: 1 });
        const data = new FormData();
        data.set('source', 'zip');
        data.set('archive', archive);
        const response = await fetch('/api/editor/import-obsidian', { method: 'POST', body: data });
        const result = await response.json().catch(() => ({})) as ImportResult;
        if (!response.ok || !result.articleId) throw new Error(result.message || '文章导入失败。');
        router.push(`/articles/${encodeURIComponent(result.articleId)}`);
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '文章导入失败，请稍后重试。');
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  return <form className={styles.importForm} onSubmit={submit}>
    <div className={styles.modeTabs} role="group" aria-label="选择导入方式">
      <button aria-pressed={mode === 'folder'} disabled={busy} onClick={() => switchMode('folder')} type="button">选择 Obsidian 目录</button>
      <button aria-pressed={mode === 'zip'} disabled={busy} onClick={() => switchMode('zip')} type="button">使用 ZIP</button>
    </div>

    {mode === 'folder' ? <section className={styles.uploadCard} aria-labelledby="folder-label">
      <div className={styles.uploadIcon}><Icon name="download" /></div>
      <div>
        <h2 id="folder-label">选择文章所在的上级目录</h2>
        <p>目录第一层可以有多篇 Markdown，并共用一个 <code>assets/</code> 或 <code>asserts/</code>。</p>
      </div>
      <label className={styles.filePicker}>
        <span>{folder ? '重新选择目录' : '选择目录'}</span>
        <input
          disabled={busy}
          onChange={(event) => chooseFolder(event.target.files)}
          ref={(node) => node?.setAttribute('webkitdirectory', '')}
          type="file"
        />
      </label>
      {folder && <div className={styles.fileSummary} aria-live="polite">
        <Icon name="file" />
        <span>
          <strong>{folder.rootName}</strong>
          <small>
            发现 {folder.markdownFiles.length} 篇文章
            {folder.attachmentDirectories.length
              ? ` · 附件目录 ${folder.attachmentDirectories.join('、')} · ${folder.imageFiles.length} 张图片`
              : ' · 未发现 assets 或 asserts'}
          </small>
        </span>
      </div>}
      {folder && <fieldset className={styles.articleChoice} disabled={busy}>
        <legend>选择要导入的文章</legend>
        <div className={styles.choiceToolbar}>
          <span aria-live="polite">已选 {selectedMarkdownFiles.length} / {folder.markdownFiles.length} 篇</span>
          <span>
            <button onClick={() => setSelectedMarkdownPaths(folder.markdownFiles.map((file) => file.webkitRelativePath))} type="button">全选</button>
            <button disabled={!selectedMarkdownFiles.length} onClick={() => setSelectedMarkdownPaths([])} type="button">清空</button>
          </span>
        </div>
        <div className={styles.articleOptions}>
          {folder.markdownFiles.map((file) => <label className={styles.articleOption} key={file.webkitRelativePath}>
            <input
              checked={selectedMarkdownPaths.includes(file.webkitRelativePath)}
              onChange={() => toggleMarkdown(file.webkitRelativePath)}
              type="checkbox"
            />
            <span>{file.name}</span>
          </label>)}
        </div>
        <small>{selectedMarkdownFiles.length ? '每篇文章只会上传正文实际引用的附件。' : '至少选择一篇文章；未选择的文章不会上传。'}</small>
      </fieldset>}
    </section> : <section className={styles.uploadCard} aria-labelledby="archive-label">
      <div className={styles.uploadIcon}><Icon name="download" /></div>
      <div>
        <h2 id="archive-label">选择兼容 ZIP 文章包</h2>
        <p>ZIP 中放一篇 Markdown，以及与它同级的 <code>assets/</code> 或 <code>asserts/</code>。</p>
      </div>
      <label className={styles.filePicker}>
        <span>{archive ? '重新选择' : '选择 ZIP'}</span>
        <input accept=".zip,application/zip" disabled={busy} onChange={(event) => chooseArchive(event.target.files?.[0])} type="file" />
      </label>
      {archive && <div className={styles.fileSummary} aria-live="polite">
        <Icon name="file" />
        <span><strong>{archive.name}</strong><small>{(archive.size / 1024 / 1024).toFixed(1)} MB</small></span>
      </div>}
    </section>}

    <section className={styles.rules} aria-labelledby="import-rules">
      <h2 id="import-rules">导入说明</h2>
      <ul>
        <li>可以一次选择多篇文章，每篇都会分别保存为私密草稿。</li>
        <li>支持 <code>assets/</code>，并兼容已有的 <code>asserts/</code> 附件路径。</li>
        <li>只上传正文引用的图片，导入结果只会保存为私密草稿。</li>
      </ul>
    </section>

    {message && <div ref={errorRef} className={styles.error} role="alert" tabIndex={-1}>
      <strong>{messageTitle}</strong><span>{message}</span>
    </div>}

    <div className={styles.actions}>
      <button className={styles.submitButton} disabled={!ready || busy} type="submit">
        {busy ? <><span className={styles.spinner} aria-hidden="true" />{progress?.phase === 'checking' ? '正在校验…' : '正在上传并生成草稿…'}</> : `导入所选文章${selectedMarkdownFiles.length > 1 ? `（${selectedMarkdownFiles.length} 篇）` : ''}`}
      </button>
      <p aria-live="polite">{busy && progress
        ? `${progress.phase === 'checking' ? '正在校验' : '正在导入'} ${progress.current} / ${progress.total}：${progress.fileName}`
        : '导入后仍需预览确认，网站不会自动发布。'}</p>
    </div>
  </form>;
}
