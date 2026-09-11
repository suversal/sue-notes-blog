'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '../../blog/components/ui-icon';
import { archiveFromWeb, makePrivateFromWeb, preparePublishFromWeb } from '../actions';
import styles from '../admin-v1.module.css';

export type ManagedArticle = { id: string; title: string; slug: string; publishedSlug?: string; topicId: string; topicName: string; status: 'draft' | 'published' | 'archived'; hasUnpublishedChanges: boolean; updatedAt: string; characterCount: number };
const statusOptions = [{ value: 'all', label: '全部' }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'changed', label: '待更新' }];

export function ArticleManager({ articles, topics, initialTopic = 'all' }: { articles: ManagedArticle[]; topics: { id: string; name: string }[]; initialTopic?: string }) {
  const [status, setStatus] = useState('all'); const [topic, setTopic] = useState(initialTopic); const [query, setQuery] = useState(''); const [order, setOrder] = useState('newest');
  const matchesStatus = (article: ManagedArticle, value: string) => value === 'all' || value === 'draft' && article.status === 'draft' || value === 'published' && article.status === 'published' && !article.hasUnpublishedChanges || value === 'changed' && article.hasUnpublishedChanges;
  const filtered = useMemo(() => { const keyword = query.trim().toLocaleLowerCase('zh-CN'); return articles.filter((article) => matchesStatus(article, status) && (topic === 'all' || article.topicId === topic) && (!keyword || `${article.title} ${article.topicName}`.toLocaleLowerCase('zh-CN').includes(keyword))).sort((a, b) => order === 'newest' ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)); }, [articles, order, query, status, topic]);
  const draft = articles.find((article) => article.status === 'draft');
  return <>
    <div className={styles.breadcrumb}><span>写作空间 / 文章</span><span>数据库已连接 · 版本自动保存</span></div>
    <header className={styles.pageHead}><div><h1>文章</h1><p>从一个念头，到一篇可以分享的文字。</p></div><Link className={styles.primaryButton} href="/articles/new"><Icon name="plus" />写文章</Link></header>
    {draft && <section className={styles.resume}><div><small>接着上次的想法</small><strong>{draft.title}</strong><span>草稿 · {new Intl.DateTimeFormat('zh-CN').format(new Date(draft.updatedAt))}</span></div><Link href={`/articles/${draft.id}`}>继续写 <Icon name="arrow" /></Link></section>}
    <section className={styles.filters}>
      <div className={styles.tabs} role="group" aria-label="筛选文章状态">{statusOptions.map(({ value, label }) => <button className={status === value ? styles.selected : ''} aria-pressed={status === value} key={value} onClick={() => setStatus(value)}>{label} <span>{articles.filter((article) => matchesStatus(article, value)).length}</span></button>)}</div>
      <div className={styles.queryControls}><label className={styles.searchInput}><Icon name="search" /><span className={styles.srOnly}>搜索文章</span><input placeholder="搜索标题、主题…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span>主题</span><select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="all">全部</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>排序</span><select value={order} onChange={(event) => setOrder(event.target.value)}><option value="newest">最新修改</option><option value="oldest">最早修改</option></select></label></div>
    </section>
    <div className={styles.listLabels}><span>标题</span><span>状态</span><span>最近修改</span><span /></div>
    <div>{filtered.map((article) => <article className={styles.manageRow} key={article.id}>
      <div className={styles.manageTitle}><Icon name={article.status === 'published' ? 'file' : 'edit'} /><div><Link href={`/articles/${article.id}`}>{article.title || '无标题草稿'}</Link><small>{article.topicName} · {article.characterCount.toLocaleString()} 字</small></div></div>
      <span className={`${styles.status} ${article.hasUnpublishedChanges ? styles.changed : article.status === 'published' ? styles.published : styles.draft}`}>{article.hasUnpublishedChanges ? '待更新' : article.status === 'published' ? '已发布' : '草稿'}</span>
      <time dateTime={article.updatedAt}>{new Intl.DateTimeFormat('zh-CN').format(new Date(article.updatedAt))}</time>
      <details className={styles.rowMenu}><summary aria-label={`更多操作：${article.title}`}><Icon name="more" /></summary><div><Link href={`/articles/${article.id}`}>编辑文章</Link>{article.status === 'published' && <Link href={`/blog/${article.publishedSlug || article.slug}`}>查看公开版本</Link>}<a href={`/articles/${article.id}/export`}>导出 Markdown</a>{article.status === 'draft' && <form action={preparePublishFromWeb}><input type="hidden" name="articleId" value={article.id} /><button type="submit">预览并发布</button></form>}{article.status === 'published' && <form action={makePrivateFromWeb}><input type="hidden" name="articleId" value={article.id} /><button className={styles.dangerText} type="submit">撤回为草稿</button></form>}<form action={archiveFromWeb}><input type="hidden" name="articleId" value={article.id} /><button className={styles.dangerText} type="submit">归档文章</button></form></div></details>
    </article>)}{filtered.length === 0 && <div className={styles.empty}><h2>没有找到文章</h2><p>换一个关键词，或者查看全部状态。</p><button onClick={() => { setStatus('all'); setTopic('all'); setQuery(''); }}>清除筛选</button></div>}</div>
    <div className={styles.listBottom}><span>共 {filtered.length} 篇文章</span><span>草稿只对自己可见</span></div>
  </>;
}
