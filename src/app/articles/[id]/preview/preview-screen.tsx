'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PublicPost, SiteProfile } from '../../../../lib/blog-data'
import { ArticleReader } from '../../../blog/components/article-reader'
import { Icon } from '../../../blog/components/ui-icon'
import { preparePublishFromWeb, publishFromWeb } from '../../actions'
import blogStyles from '../../../blog/blog-v1.module.css'
import styles from '../../admin-v1.module.css'

export function PreviewScreen({
  post,
  site,
  approvalId,
  updating,
  embedded = false,
}: {
  post: PublicPost
  site: SiteProfile
  approvalId?: string
  updating: boolean
  embedded?: boolean
}) {
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [confirm, setConfirm] = useState(false)
  const [approved, setApproved] = useState(false)
  const content = (
    <>
      <div className={styles.previewBrand}>
        {site.siteName}<span>私密预览</span>
      </div>
      <ArticleReader post={post} preview />
    </>
  )

  // 手机预览把这个页面放进一个手机宽度的内嵌窗口里再加载一次：只有这样，
  // 前台按屏幕宽度写的手机样式才会真正生效。这里是窗口里那一份，不带工具栏。
  if (embedded)
    return (
      <div className={`${styles.previewScreen} ${styles.previewEmbedded}`}>
        <div className={`${styles.previewFrame} ${styles.embeddedFrame} ${blogStyles.publicRoot}`}>
          {content}
        </div>
      </div>
    )

  return (
    <div className={styles.previewScreen}>
      <header className={styles.previewToolbar}>
        <Link href={`/articles/${post.id}`}>
          <Icon name="back" />返回编辑
        </Link>
        <div role="group" aria-label="预览设备">
          <button
            className={device === 'desktop' ? styles.selected : ''}
            aria-pressed={device === 'desktop'}
            onClick={() => setDevice('desktop')}
          >
            桌面
          </button>
          <button
            className={device === 'phone' ? styles.selected : ''}
            aria-pressed={device === 'phone'}
            onClick={() => setDevice('phone')}
          >
            手机
          </button>
        </div>
        {approvalId ? (
          <button className={styles.primaryButton} onClick={() => setConfirm(true)}>
            {updating ? '确认更新' : '确认发布'} <Icon name="arrow" />
          </button>
        ) : (
          <form action={preparePublishFromWeb}>
            <input type="hidden" name="articleId" value={post.id} />
            <button className={styles.primaryButton} type="submit">
              准备发布 <Icon name="arrow" />
            </button>
          </form>
        )}
      </header>
      {device === 'phone' ? (
        <iframe
          className={styles.phoneFrame}
          title="手机预览"
          src={`/articles/${post.id}/preview?frame=1${approvalId ? `&approval=${encodeURIComponent(approvalId)}` : ''}`}
        />
      ) : (
        <div className={`${styles.previewFrame} ${blogStyles.publicRoot}`}>{content}</div>
      )}
      {confirm && approvalId && (
        <div className={styles.modalOverlay}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-confirm-title"
          >
            <header>
              <h2 id="publish-confirm-title">
                {updating ? '更新这篇公开文章' : '让这篇文章与读者见面'}
              </h2>
              <button aria-label="关闭" onClick={() => setConfirm(false)}>
                <Icon name="close" />
              </button>
            </header>
            <p>
              你即将{updating ? '更新' : '公开'}刚刚预览的版本。
              {updating ? '读者将看到新的内容。' : '任何访问博客的人都能阅读。'}
            </p>
            <div className={styles.confirmTitle}>{post.title}</div>
            <small>
              主题：{post.topic.name}<br />文章链接：/blog/{post.slug}
            </small>
            <label className={styles.confirmCheck}>
              <input
                type="checkbox"
                checked={approved}
                onChange={(event) => setApproved(event.target.checked)}
              />
              <span>我已检查预览，确认这篇文章可以公开。</span>
            </label>
            <form action={publishFromWeb} className={styles.modalActions}>
              <input type="hidden" name="articleId" value={post.id} />
              <input type="hidden" name="approvalId" value={approvalId} />
              <button type="button" onClick={() => setConfirm(false)}>
                再看一遍
              </button>
              <button className={styles.primaryButton} disabled={!approved} type="submit">
                {updating ? '更新文章' : '现在发布'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
