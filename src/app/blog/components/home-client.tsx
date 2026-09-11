'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PublicPost, SiteProfile } from '../../../lib/blog-data';
import { readingMinutes } from '../../../lib/blog-shared';
import { Icon } from './ui-icon';
import { Plate } from './plate';
import styles from '../blog-v1.module.css';

function Meta({ post }: { post: PublicPost }) { return <div className={styles.meta}><span>{post.topic.name}</span><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(post.publishedAt))}</time><span>{readingMinutes(post.plainText)} 分钟阅读</span></div>; }

export function HomeClient({ posts, site }: { posts: PublicPost[]; site: SiteProfile }) {
  const topics = [...new Map(posts.filter((post) => post.topic.name !== '未分类').map((post) => [post.topic.id, post.topic])).values()]; const featured = posts[0];
  const [topic, setTopic] = useState('all'); const [visible, setVisible] = useState(4); const newItem = useRef<number | null>(null); const results = useRef<HTMLDivElement>(null);
  const rows = posts.filter((post) => topic === 'all' ? post.id !== featured?.id : post.topic.id === topic); const shown = rows.slice(0, visible);
  useEffect(() => { if (newItem.current === null) return; results.current?.querySelectorAll<HTMLAnchorElement>(`.${styles.postTitle}`)[newItem.current]?.focus({ preventScroll: true }); newItem.current = null; }, [shown.length]);
  const chooseTopic = (value: string) => { setTopic(value); setVisible(4); newItem.current = null; };
  return <>
    <div className={styles.strap}><span>{site.tagline}</span><span>个人博客 · 已发布 {posts.length} 篇文章</span></div>
    {featured ? <section className={styles.feature}><div className={styles.featureCopy}><p className={styles.eyebrow}>最新手记 <span>/ LATEST ENTRY</span></p><Link href={`/blog/${featured.slug}`}><h1>{featured.title}</h1></Link><p>{featured.excerpt}</p><div className={styles.featureBottom}><Meta post={featured} /><Link className={styles.roundArrow} href={`/blog/${featured.slug}`} aria-label={`阅读：${featured.title}`}><Icon name="arrow" /></Link></div></div>{featured.coverStyle !== 'none' && <Link className={styles.featureArt} href={`/blog/${featured.slug}`} aria-label={`打开精选文章：${featured.title}`}><Plate type={featured.coverStyle} /></Link>}</section> : <section className={styles.emptyHero}><p className={styles.eyebrow}>LATEST ENTRY</p><h1>第一篇文字，正在路上。</h1><p>文章在预览并明确确认发布后，会出现在这里。</p></section>}
    <div className={styles.homeGrid}><section><div className={styles.sectionHeading}><h2>最近的文字</h2><span>慢慢积累的实践与想法</span></div><div className={styles.topicTabs} role="group" aria-label="筛选文章主题"><button className={topic === 'all' ? styles.selected : ''} aria-pressed={topic === 'all'} onClick={() => chooseTopic('all')}>全部</button>{topics.map((item) => <button className={topic === item.id ? styles.selected : ''} aria-pressed={topic === item.id} onClick={() => chooseTopic(item.id)} key={item.id}>{item.name}</button>)}</div><div ref={results} className={styles.homeResults}>{shown.map((post) => <article className={styles.postRow} key={post.id}><div><Meta post={post} /><Link className={styles.postTitle} href={`/blog/${post.slug}`}><h3>{post.title}</h3></Link><p>{post.excerpt}</p></div>{post.coverStyle !== 'none' && <Link className={styles.thumbnail} href={`/blog/${post.slug}`} aria-label={`阅读：${post.title}`}><Plate type={post.coverStyle} compact /></Link>}</article>)}{rows.length === 0 && <div className={styles.empty}><h3>这个主题，还在慢慢积累。</h3><button onClick={() => chooseTopic('all')}>看看全部文章</button></div>}</div><div className={styles.listBottom}><span role="status">{rows.length ? visible < rows.length ? `已显示 ${shown.length} / ${rows.length} 篇` : `已显示全部 ${rows.length} 篇文章` : '暂无文章'}</span>{visible < rows.length && <button onClick={() => { newItem.current = shown.length; setVisible((count) => count + 4); }}>加载更多 <span aria-hidden="true">↓</span></button>}</div></section>
      <aside className={styles.homeAside}><section><div className={styles.asideHeading}><h2>最近更新</h2><span>按发布时间</span></div><ol className={styles.recentList}>{posts.slice(0, 5).map((post, index) => <li key={post.id}><span>{String(index + 1).padStart(2, '0')}</span><div><Link href={`/blog/${post.slug}`}>{post.title}</Link><small>{post.topic.name} · {readingMinutes(post.plainText)} 分钟</small></div></li>)}</ol></section>{topics.length > 0 && <section className={styles.sideTopics}><h2>沿着主题读</h2>{topics.map((item) => <button key={item.id} onClick={() => chooseTopic(item.id)}><span>{item.name}</span><span>{String(posts.filter((post) => post.topic.id === item.id).length).padStart(2, '0')}</span></button>)}</section>}</aside>
    </div>
  </>;
}
