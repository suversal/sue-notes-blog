'use client';

import { useActionState, useRef, useState } from 'react';
import type { ArticleContent } from '../../../lib/article-content-data';
import { emptyArticleContent } from '../../../lib/article-content-data';
import { createDraftAndEditFromWeb, type CreateDraftState } from '../actions';
import styles from '../admin-v1.module.css';
import { ArticleContentEditor } from '../components/article-content-editor';

export function NewArticleForm({ topics }: { topics: { id: string; name: string }[] }) {
  const [content, setContent] = useState<ArticleContent>(emptyArticleContent);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [slug, setSlug] = useState('');
  const contentInput = useRef<HTMLInputElement>(null);
  const latestContent = useRef(content);
  const [importing, setImporting] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [state, formAction, pending] = useActionState(createDraftAndEditFromWeb, { message: '' } satisfies CreateDraftState);
  const fieldError = (field: NonNullable<typeof state.field>) => state.field === field ? state.message : undefined;
  const setEditorContent = (next: ArticleContent) => {
    latestContent.current = next;
    setContent(next);
  };
  return <form className={styles.editorLayout} action={formAction} onSubmit={(event) => {
    if (importing) {
      event.preventDefault();
      setSyncError('图片正在归档，完成后即可保存。');
      return;
    }
    setSyncError('');
    if (contentInput.current) contentInput.current.value = JSON.stringify(latestContent.current);
  }}>
    <input ref={contentInput} type="hidden" name="content" value={JSON.stringify(content)} readOnly />
    <section className={styles.writing}>
      <p className={styles.kicker}>一篇新的手记 / DRAFT</p>
      <label><span>标题</span><textarea name="title" required maxLength={180} className={styles.titleInput} placeholder="给这个想法起个标题…" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(fieldError('title'))} aria-describedby={fieldError('title') ? 'title-error' : undefined} />{fieldError('title') && <small className={styles.fieldError} id="title-error" role="alert">{fieldError('title')}</small>}</label>
      <label><span className={styles.srOnly}>文章摘要</span><textarea name="excerpt" maxLength={500} className={styles.excerptInput} placeholder="用一两句话，告诉读者这篇文章在说什么…" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></label>
      <ArticleContentEditor value={content} onChange={setEditorContent} onImportStateChange={setImporting} />
      {fieldError('content') && <p className={styles.fieldError} role="alert">{fieldError('content')}</p>}
      {syncError && <p className={styles.fieldError} role="alert">{syncError}</p>}
    </section>
    <aside className={styles.editorSettings}>
      <h2>文章设置</h2>
      {fieldError('form') && <p className={styles.formError} role="alert">{fieldError('form')}</p>}
      <label><span>主题</span><select name="topicId">{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <label><span>文章链接</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-first-post" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} aria-invalid={Boolean(fieldError('slug'))} aria-describedby="slug-help slug-error" /><small id="slug-help">小写字母、数字和连字符。</small>{fieldError('slug') && <small className={styles.fieldError} id="slug-error" role="alert">{fieldError('slug')}</small>}</label>
      <label><span>文章封面</span><select name="coverStyle"><option value="none">无封面 · 纯文字</option><option value="notes">手记 · 纸张</option><option value="grid">创造 · 网格</option><option value="cache">工程 · 路径</option></select></label>
      <p>草稿只对自己可见。保存后进入编辑器，再预览读者看到的样子。</p>
      <button className={styles.primaryButton} type="submit" disabled={pending || importing}>{pending ? '正在创建草稿…' : importing ? '正在归档图片…' : '保存并继续编辑'}</button>
    </aside>
  </form>;
}
