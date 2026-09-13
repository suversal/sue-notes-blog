'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { articleContentPlainText, type ArticleContent } from '../../../lib/article-content-data';
import { Icon } from '../../blog/components/ui-icon';
import { StudioSelect } from '../../components/studio-select';
import { CoverPicker, type CoverValue } from '../components/cover-picker';
import { ArticleContentEditor } from '../components/article-content-editor';
import styles from '../admin-v1.module.css';

type Save = (formData: FormData) => Promise<{ ok: boolean; message: string; slug?: string }>;
type Preview = (articleId: string) => Promise<{ ok: boolean; message: string; url?: string }>;
type EditorFormProps = {
  articleId: string;
  status: string;
  initial: {
    title: string;
    slug: string;
    excerpt: string;
    content: ArticleContent;
    topicId: string;
    coverImage?: CoverValue['image'];
    coverStyle: 'none' | 'notes' | 'grid' | 'cache';
    publicReferences: { label: string; url: string }[];
  };
  topics: { id: string; name: string }[];
  save: Save;
  preparePreview: Preview;
};

function formDataFrom(form: HTMLFormElement) {
  const data = new FormData();
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || !element.name || element.disabled) continue;
    if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of Array.from(element.selectedOptions)) data.append(element.name, option.value);
    } else data.append(element.name, element.value);
  }
  return data;
}

export function EditorForm({ articleId, status: articleStatus, initial, topics, save, preparePreview }: EditorFormProps) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const dirtyRef = useRef(false);
  const contentRef = useRef(initial.content);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('已保存到数据库');
  const [showSettings, setShowSettings] = useState(true);
  const [content, setContent] = useState(initial.content);
  const [cover, setCover] = useState<CoverValue>({ style: initial.coverStyle, image: initial.coverImage });
  const [coverUploading, setCoverUploading] = useState(false);
  const [topicId, setTopicId] = useState(initial.topicId);

  const change = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    setMessage('有未保存更改。');
  }, []);

  const persist = useCallback(async () => {
    if (!form.current || saving.current) return true;
    if (importing) {
      setMessage('正文图片正在上传，请等待完成后再保存。');
      return false;
    }
    if (coverUploading) {
      setMessage('封面正在上传，请等待完成后再保存。');
      return false;
    }
    if (!dirtyRef.current) return true;

    saving.current = true;
    setBusy(true);
    setMessage('正在保存新版本…');
    try {
      const data = formDataFrom(form.current);
      data.set('content', JSON.stringify(contentRef.current));
      const result = await save(data);
      setMessage(result.message);
      if (result.ok) {
        const slugField = form.current?.elements.namedItem('slug');
        if (result.slug && slugField instanceof HTMLInputElement && slugField.value === String(data.get('slug') ?? '')) slugField.value = result.slug;
        dirtyRef.current = false;
        setDirty(false);
        router.refresh();
      }
      return result.ok;
    } catch {
      setMessage('保存失败，请检查网络后重试。');
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }, [importing, coverUploading, router, save]);

  const preview = async () => {
    const saved = await persist();
    if (!saved) return;
    setBusy(true);
    const result = await preparePreview(articleId);
    setMessage(result.message);
    setBusy(false);
    if (result.ok && result.url) router.push(result.url);
  };

  const setEditorContent = (next: ArticleContent) => {
    contentRef.current = next;
    setContent(next);
    change();
  };

  return <form ref={form} onInput={change} onSubmit={(event) => { event.preventDefault(); void persist(); }}>
    <input type="hidden" name="articleId" value={articleId} />
    <header className={styles.editorHeader}>
      <Link href="/articles"><Icon name="back" />文章</Link>
      <span className={`${styles.status} ${articleStatus === 'published' ? styles.published : styles.draft}`}>{articleStatus === 'published' ? dirty ? '有未发布修改' : '已发布' : '草稿'}</span>
      <span className={styles.saveState} role="status">{message}</span>
      <div>
        <button type="button" aria-label="切换文章设置" aria-expanded={showSettings} onClick={() => setShowSettings((value) => !value)}><Icon name="settings" /></button>
        <button className={styles.primaryButton} type="button" disabled={busy || importing || coverUploading} onClick={preview}><Icon name="eye" />{busy ? '正在准备…' : '预览与发布'}</button>
      </div>
    </header>
    <div className={`${styles.editorLayout} ${!showSettings ? styles.editorWide : ''}`}>
      <section className={styles.writing}>
        <p className={styles.kicker}>{articleStatus === 'published' ? '继续打磨这篇文字 / EDIT' : '一篇新的手记 / DRAFT'}</p>
        <label><span>标题</span><textarea name="title" required maxLength={180} className={styles.titleInput} defaultValue={initial.title} /></label>
        <label><span className={styles.srOnly}>文章摘要</span><textarea name="excerpt" maxLength={500} className={styles.excerptInput} defaultValue={initial.excerpt} placeholder="用一两句话，告诉读者这篇文章在说什么…" /></label>
        <ArticleContentEditor value={content} onChange={setEditorContent} onImportStateChange={setImporting} />
        <div className={styles.wordCount}>{articleContentPlainText(content).length.toLocaleString()} 字 · 结构化正文</div>
        <details className={styles.advanced}>
          <summary>公开引用</summary>
          <div className={styles.twoCol}>
            <label><span>引用名称</span><input name="publicReferenceLabel" defaultValue={initial.publicReferences[0]?.label ?? ''} /></label>
            <label><span>引用链接</span><input name="publicReferenceUrl" type="url" defaultValue={initial.publicReferences[0]?.url ?? ''} /></label>
          </div>
        </details>
      </section>
      <aside className={styles.editorSettings} hidden={!showSettings}>
        <h2>文章设置</h2>
        <div className={styles.settingField}><span>主题</span><input type="hidden" name="topicId" value={topicId} /><StudioSelect label="文章主题" value={topicId} onChange={(value) => { setTopicId(value); change(); }} options={topics.map((topic) => ({ value: topic.id, label: topic.name }))} /><Link href="/articles/topics">管理主题 ↗</Link></div>
        <label><span>文章链接（选填）</span><input name="slug" placeholder="留空保留原链接" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={initial.slug} /><small>/blog/{initial.slug}<br />留空保留原链接；自定义时使用小写字母、数字和连字符。</small></label>
        <CoverPicker value={cover} onChange={(next) => { setCover(next); change(); }} onBusyChange={setCoverUploading} />
        <p><strong>{articleStatus === 'published' ? '公开版本仍保持原样' : '准备好了，再分享。'}</strong>{articleStatus === 'published' ? '这里的修改需要手动保存。预览并确认更新后，读者才会看到新版本。' : '请先保存草稿，再预览读者看到的样子并确认公开。'}</p>
        <a href={`/articles/${articleId}/export`}>导出 Markdown ↗</a>
        <button className={styles.secondaryButton} type="submit" disabled={!dirty || busy || importing || coverUploading}>{busy ? '正在保存…' : '立即保存'}</button>
      </aside>
    </div>
  </form>;
}
