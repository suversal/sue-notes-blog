'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '../../../(site)/blog/components/ui-icon';
import { compareArticleAdminOrder, formatArticleAdminDateTime, type ArticleAdminOrder } from '../../../../lib/article-admin-sort';
import { archiveFromWeb, makePrivateFromWeb, preparePublishFromWeb, setArticlePinPriorityFromWeb, setArticleSourceUrlFromWeb } from '../actions';
import { StudioSelect } from '../../../components/studio-select';
import styles from '../admin-v1.module.css';
import importStyles from '../import/import.module.css';

export type ManagedArticle = { id: string; title: string; slug: string; publishedSlug?: string; topicId: string; topicName: string; status: 'draft' | 'published' | 'archived'; hasUnpublishedChanges: boolean; pinPriority: number; sourceUrl: string; publishedAt?: string; updatedAt: string; characterCount: number };
const statusOptions = [{ value: 'all', label: '全部' }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'changed', label: '待更新' }];

function SourceUrlSubmitButton() {
  const { pending } = useFormStatus();
  return <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? '正在保存…' : '保存链接'}</button>;
}

function PinPrioritySubmitButton() {
  const { pending } = useFormStatus();
  return <button className={styles.primaryButton} disabled={pending} type="submit">{pending ? '正在保存…' : '保存优先级'}</button>;
}

export function ArticleManager({ articles, topics, initialTopic = 'all' }: { articles: ManagedArticle[]; topics: { id: string; name: string }[]; initialTopic?: string }) {
  const [status, setStatus] = useState('all'); const [topic, setTopic] = useState(initialTopic); const [query, setQuery] = useState(''); const [order, setOrder] = useState<ArticleAdminOrder>('published-newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pinTarget, setPinTarget] = useState<ManagedArticle | null>(null);
  const [sourceTarget, setSourceTarget] = useState<ManagedArticle | null>(null);
  const menuTriggers = useRef(new Map<string, HTMLElement>());
  const pinReturnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!openMenuId) return;
    const dismissOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-article-row-menu]')) setOpenMenuId(null);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenMenuId(null);
      menuTriggers.current.get(openMenuId)?.focus();
    };
    document.addEventListener('pointerdown', dismissOnOutsideClick);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [openMenuId]);
  useEffect(() => {
    if (!pinTarget) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPinTarget(null);
      window.requestAnimationFrame(() => pinReturnFocus.current?.focus());
    };
    document.addEventListener('keydown', dismissOnEscape);
    return () => document.removeEventListener('keydown', dismissOnEscape);
  }, [pinTarget]);
  useEffect(() => {
    if (!sourceTarget) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSourceTarget(null);
      window.requestAnimationFrame(() => pinReturnFocus.current?.focus());
    };
    document.addEventListener('keydown', dismissOnEscape);
    return () => document.removeEventListener('keydown', dismissOnEscape);
  }, [sourceTarget]);
  const closeSourceDialog = () => {
    setSourceTarget(null);
    window.requestAnimationFrame(() => pinReturnFocus.current?.focus());
  };
  const closePinDialog = () => {
    setPinTarget(null);
    window.requestAnimationFrame(() => pinReturnFocus.current?.focus());
  };
  const matchesStatus = (article: ManagedArticle, value: string) => value === 'all' || value === 'draft' && article.status === 'draft' || value === 'published' && article.status === 'published' && !article.hasUnpublishedChanges || value === 'changed' && article.hasUnpublishedChanges;
  const filtered = useMemo(() => { const keyword = query.trim().toLocaleLowerCase('zh-CN'); return articles.filter((article) => matchesStatus(article, status) && (topic === 'all' || article.topicId === topic) && (!keyword || `${article.title} ${article.topicName}`.toLocaleLowerCase('zh-CN').includes(keyword))).sort((a, b) => compareArticleAdminOrder(a, b, order)); }, [articles, order, query, status, topic]);
  const showsPublishedAt = order === 'published-newest' || order === 'published-oldest';
  const draft = articles.find((article) => article.status === 'draft');
  return <>
    <div className={styles.breadcrumb}><span>写作空间 / 文章</span><span>数据库已连接 · 手动保存版本</span></div>
    <header className={styles.pageHead}><div><h1>文章</h1><p>从一个念头，到一篇可以分享的文字。</p></div><div className={importStyles.headerActions}><Link className={styles.secondaryButton} href="/articles/import"><Icon name="download" />导入 Obsidian</Link><Link className={styles.primaryButton} href="/articles/new"><Icon name="plus" />写文章</Link></div></header>
    {draft && <section className={styles.resume}><div><small>接着上次的想法</small><strong>{draft.title}</strong><span>草稿 · {formatArticleAdminDateTime(draft.updatedAt)}</span></div><Link href={`/articles/${draft.id}`}>继续写 <Icon name="arrow" /></Link></section>}
    <section className={styles.filters}>
      <div className={styles.tabs} role="group" aria-label="筛选文章状态">{statusOptions.map(({ value, label }) => <button className={status === value ? styles.selected : ''} aria-pressed={status === value} key={value} onClick={() => setStatus(value)}>{label} <span>{articles.filter((article) => matchesStatus(article, value)).length}</span></button>)}</div>
      <div className={styles.queryControls}>
        <label className={`${styles.searchInput} ${styles.articleSearch}`}><Icon name="search" /><span className={styles.srOnly}>搜索文章</span><input type="search" placeholder="搜索标题、主题…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}><Icon name="close" /></button>}</label>
        <div className={styles.filterControl}><span>主题</span><StudioSelect label="筛选文章主题" value={topic} onChange={setTopic} options={[{ value: 'all', label: '全部主题' }, ...topics.map((item) => ({ value: item.id, label: item.name }))]} /></div>
        <div className={styles.filterControl}><span>排序</span><StudioSelect label="文章排序" value={order} onChange={(value) => setOrder(value as ArticleAdminOrder)} options={[{ value: 'newest', label: '最新修改' }, { value: 'oldest', label: '最早修改' }, { value: 'published-newest', label: '最新发布' }, { value: 'published-oldest', label: '最早发布' }]} /></div>
      </div>
    </section>
    <div className={styles.listLabels}><span>标题</span><span>状态</span><span>{showsPublishedAt ? '发布时间' : '最近修改'}</span><span /></div>
    <div>{filtered.map((article) => <article className={styles.manageRow} key={article.id}>
      <div className={styles.manageTitle}><Icon className={article.hasUnpublishedChanges ? styles.changedIcon : article.status === 'published' ? styles.publishedIcon : styles.draftIcon} name={article.hasUnpublishedChanges ? 'refresh' : article.status === 'published' ? 'published' : 'edit'} /><div><Link href={article.status === 'published' ? `/blog/${article.publishedSlug || article.slug}` : `/articles/${article.id}/preview`}>{article.title || '无标题草稿'}</Link><small><span>{article.topicName} · {article.characterCount.toLocaleString()} 字</span>{article.pinPriority > 0 && <span className={styles.pinBadge}>置顶 {article.pinPriority}</span>}{article.sourceUrl && <span className={styles.pinBadge}>X 原文</span>}</small></div></div>
      <span className={`${styles.status} ${article.hasUnpublishedChanges ? styles.changed : article.status === 'published' ? styles.published : styles.draft}`}>{article.hasUnpublishedChanges ? '待更新' : article.status === 'published' ? '已发布' : '草稿'}</span>
      {showsPublishedAt ? article.publishedAt ? <time dateTime={article.publishedAt}>{formatArticleAdminDateTime(article.publishedAt)}</time> : <span className={styles.unpublishedTime}>未发布</span> : <time dateTime={article.updatedAt}>{formatArticleAdminDateTime(article.updatedAt)}</time>}
      <details className={styles.rowMenu} data-article-row-menu open={openMenuId === article.id}><summary ref={(node) => { if (node) menuTriggers.current.set(article.id, node); else menuTriggers.current.delete(article.id); }} aria-expanded={openMenuId === article.id} aria-label={`更多操作：${article.title}`} onClick={(event) => { event.preventDefault(); setOpenMenuId((current) => current === article.id ? null : article.id); }}><Icon name="more" /></summary><div><Link href={`/articles/${article.id}`}>编辑文章</Link>{article.status === 'published' && <><Link href={`/blog/${article.publishedSlug || article.slug}`}>查看公开版本</Link><button className={styles.menuAction} type="button" onClick={(event) => { pinReturnFocus.current = event.currentTarget; setOpenMenuId(null); setPinTarget(article); }}>{article.pinPriority > 0 ? `修改置顶（${article.pinPriority}）` : '设置置顶'}</button></>}<button className={styles.menuAction} type="button" onClick={(event) => { pinReturnFocus.current = event.currentTarget; setOpenMenuId(null); setSourceTarget(article); }}>{article.sourceUrl ? '修改 X 原文链接' : '设置 X 原文链接'}</button><a href={`/articles/${article.id}/export`}>导出 Markdown</a>{article.status === 'draft' && <form action={preparePublishFromWeb}><input type="hidden" name="articleId" value={article.id} /><button type="submit">预览并发布</button></form>}{article.status === 'published' && <form action={makePrivateFromWeb}><input type="hidden" name="articleId" value={article.id} /><button className={styles.dangerText} type="submit">撤回为草稿</button></form>}<form action={archiveFromWeb}><input type="hidden" name="articleId" value={article.id} /><button className={styles.dangerText} type="submit">归档文章</button></form></div></details>
    </article>)}{filtered.length === 0 && <div className={styles.empty}><h2>没有找到文章</h2><p>换一个关键词，或者查看全部状态。</p><button onClick={() => { setStatus('all'); setTopic('all'); setQuery(''); }}>清除筛选</button></div>}</div>
    {pinTarget && <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) closePinDialog(); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pin-priority-title"><header><h2 id="pin-priority-title">设置文章置顶</h2><button type="button" aria-label="关闭置顶设置" onClick={closePinDialog}><Icon name="close" /></button></header><p className={styles.modalDescription}>“{pinTarget.title}”</p><form action={setArticlePinPriorityFromWeb} key={pinTarget.id}><input type="hidden" name="articleId" value={pinTarget.id} /><label htmlFor="pin-priority"><span>置顶优先级</span><input id="pin-priority" name="pinPriority" type="number" inputMode="numeric" min="0" max="999" step="1" required autoFocus defaultValue={pinTarget.pinPriority} /><small>输入 1–999 置顶，数字越小首页越靠前；输入 0 取消置顶。</small></label><div className={styles.modalActions}><button type="button" onClick={closePinDialog}>取消</button><PinPrioritySubmitButton /></div></form></section></div>}
    {sourceTarget && <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) closeSourceDialog(); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="source-url-title"><header><h2 id="source-url-title">设置 X 原文链接</h2><button type="button" aria-label="关闭 X 原文链接设置" onClick={closeSourceDialog}><Icon name="close" /></button></header><p className={styles.modalDescription}>“{sourceTarget.title}”</p><form action={setArticleSourceUrlFromWeb} key={sourceTarget.id}><input type="hidden" name="articleId" value={sourceTarget.id} /><label htmlFor="source-url"><span>X 原文链接</span><input id="source-url" name="sourceUrl" type="url" inputMode="url" maxLength={500} autoFocus placeholder="https://x.com/suversal/status/…" defaultValue={sourceTarget.sourceUrl} /><small>填写后，文章页会出现「在 X 上查看原文」；留空保存则不显示。保存后立即生效，不需要重新发布文章。</small></label><div className={styles.modalActions}><button type="button" onClick={closeSourceDialog}>取消</button><SourceUrlSubmitButton /></div></form></section></div>}
    <div className={styles.listBottom}><span>共 {filtered.length} 篇文章</span><span>草稿只对自己可见</span></div>
  </>;
}
