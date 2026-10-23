'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import archiveStyles from '../blog-v1.module.css'
import styles from '../friends/friends.module.css'
import listing from '../listing.module.css'
import usesStyles from '../uses/uses.module.css'
import { earliestMetMonth, friendDomain, friendHue, friendTilt } from '../../../../lib/friend-links-labels'
import type { FriendCard, FriendLink } from '../../../../lib/friend-links-service'
import { FriendsComments } from './friends-comments'
import { Icon } from './ui-icon'

// 编辑界面只有站点所有者用得到，单独打包，访客不会下载。
const FriendControls = dynamic(() => import('./friends-editor').then((module) => module.FriendControls))
const FriendForm = dynamic(() => import('./friends-editor').then((module) => module.FriendForm))
const FriendCardForm = dynamic(() => import('./friends-editor').then((module) => module.FriendCardForm))

export type SelfCard = { name: string; url: string; avatar: string; motto: string; author: string }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Postmark({ friend }: { friend: FriendLink }) {
  const ringId = `ring-${useId().replace(/[^\w-]/g, '')}`
  const [year, month, day] = friend.metAt.split('-')
  // 外圈一圈放不下太长的域名，截短后再挤进去。
  const ring = `${friendDomain(friend.url).slice(0, 24)} · 结识于 · `.toUpperCase()
  return (
    <svg className={styles.postmark} viewBox="0 0 150 84" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <path className={styles.ink} pathLength={1} style={{ '--k': k } as CSSProperties} d={`M2 ${28 + k * 14} q10 -6 20 0 t20 0 t20 0 t20 0`} fill="none" stroke="currentColor" strokeWidth="2" key={k} />
      ))}
      <defs>
        <path id={ringId} d="M112,42 m-31,0 a31,31 0 1,1 62,0 a31,31 0 1,1 -62,0" />
      </defs>
      <circle className={styles.ink} pathLength={1} style={{ '--k': 2 } as CSSProperties} cx="112" cy="42" r="38" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(150 112 42)" />
      <circle className={styles.ink} pathLength={1} style={{ '--k': 3 } as CSSProperties} cx="112" cy="42" r="24" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(150 112 42)" />
      <text fontSize="7.4" letterSpacing="1.1" fontWeight="600">
        <textPath href={`#${ringId}`} textLength="190">{ring}</textPath>
      </text>
      <text x="112" y="42" textAnchor="middle" fontSize="13" fontWeight="700">{year}</text>
      <text x="112" y="54" textAnchor="middle" fontSize="8.5" letterSpacing="1">{month}·{day}</text>
    </svg>
  )
}

function Stamp({ friend }: { friend: FriendLink }) {
  const [broken, setBroken] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  // 图片可能在水合之前就加载失败了，那时 onError 已经错过，挂载后再查一次。
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) setBroken(true)
  }, [])
  return (
    <span className={styles.stamp}>
      <span className={styles.stampFace} style={{ '--h': friendHue(friend.url) } as CSSProperties}>
        <small>80分</small>
        {friend.avatarUrl && !broken ? (
          <img ref={image} src={friend.avatarUrl} alt="" width="40" height="40" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          friend.name.slice(0, 1)
        )}
        <i>友邻</i>
      </span>
    </span>
  )
}

function CardBody({ friend, index }: { friend: FriendLink; index: number }) {
  return (
    <>
      <span className={styles.serial}>
        No.{String(index + 1).padStart(2, '0')}
        {!friend.isVisible && <em>已隐藏</em>}
      </span>
      <Stamp friend={friend} />
      <Postmark friend={friend} />
      <h3>{friend.name}</h3>
      {friend.author && <span className={styles.who}>{friend.author}</span>}
      <p className={styles.motto}>{friend.motto}</p>
      {friend.note && (
        <p className={styles.note}>{friend.note}</p>
      )}
      <div className={styles.address}>
        <span>寄往</span>
        <span className={styles.domain}>{friendDomain(friend.url)}</span>
        <Icon name="arrow" />
      </div>
    </>
  )
}

const check = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
  </svg>
)

/** 「复制」上滑淡出、「已复制」从下方滑入；复原时继续往上走，不会倒带。 */
function CopyButton({ value, label, idle, done, className }: { value: string; label: string; idle: string; done: string; className: string }) {
  const [phase, setPhase] = useState<'idle' | 'done' | 'out'>('idle')
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const copy = () => {
    void navigator.clipboard?.writeText(value).catch(() => undefined)
    timers.current.forEach(clearTimeout)
    setPhase('done')
    timers.current = [
      window.setTimeout(() => {
        setPhase('out')
        timers.current.push(window.setTimeout(() => setPhase('idle'), 240))
      }, 1600),
    ]
  }
  return (
    <button className={`${className} ${phase === 'idle' ? '' : styles[phase]}`} type="button" aria-label={phase === 'done' ? `${label}已复制` : `复制${label}`} onClick={copy}>
      <span className={styles.swap} aria-hidden="true">
        <span className={styles.swapIdle}>{idle}</span>
        <span className={styles.swapDone}>
          {check}
          {done}
        </span>
      </span>
    </button>
  )
}

export function FriendsClient({ friends, self, card, cardDefaults, canEdit = false }: { friends: FriendLink[]; self: SelfCard; card?: FriendCard; cardDefaults?: FriendCard; canEdit?: boolean }) {
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [landed, setLanded] = useState<FriendLink | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const grid = useRef<HTMLElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const publicFriends = friends.filter((friend) => friend.isVisible)
  const shown = editMode ? friends : publicFriends

  // 进场：卡片进入视口才播放；同一批进来的按顺序错开 90ms。用 data 属性标记，React 重新渲染不会把它抹掉。
  useEffect(() => {
    const root = grid.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, order) => {
            const card = entry.target as HTMLElement
            card.style.setProperty('--d', `${order * 90}ms`)
            card.dataset.shown = ''
            observer.unobserve(card)
          })
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    root.querySelectorAll<HTMLElement>('[data-card]:not([data-shown])').forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [shown.length, editMode, editing])

  const moveRing = (card: HTMLElement, ms: number, easing = 'var(--glide)') => {
    const el = ring.current
    if (!el) return
    el.style.transition = ms ? `opacity 320ms ease, transform ${ms}ms ${easing}, width ${ms}ms ${easing}, height ${ms}ms ${easing}` : 'none'
    el.style.transform = `translate(${card.offsetLeft - 7}px, ${card.offsetTop - 7}px)`
    el.style.width = `${card.offsetWidth + 14}px`
    el.style.height = `${card.offsetHeight + 14}px`
  }

  const restamp = (card: HTMLElement) => {
    const mark = card.querySelector(`.${styles.postmark}`)
    if (!mark) return
    // 抬起（减速）→ 落下（加速撞上）→ 回稳，每段各用各的缓动
    mark.animate(
      [
        { opacity: 0.78, scale: 1, translate: '0 0', easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 0.12, scale: 1.3, translate: '0 -10px', offset: 0.38, easing: 'cubic-bezier(.55,0,.9,.45)' },
        { opacity: 0.95, scale: 0.95, translate: '0 0', offset: 0.6, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { opacity: 0.78, scale: 1, translate: '0 0' },
      ],
      { duration: 900 },
    )
    card.animate([{ scale: 1 }, { scale: 1, offset: 0.58 }, { scale: 0.988, offset: 0.64 }, { scale: 1 }], { duration: 900, easing: 'ease-out' })
    const ripple = Object.assign(document.createElement('span'), { className: styles.ripple })
    card.append(ripple)
    ripple
      .animate([{ scale: 0.5, opacity: 0.55 }, { scale: 2.3, opacity: 0 }], { duration: 1000, delay: 560, easing: 'cubic-bezier(.16,1,.3,1)' })
      .finished.then(() => ripple.remove(), () => ripple.remove())
  }

  // 随便敲一扇门：细框沿阅读顺序挨家滑过、越走越慢，落定后在那张卡上重新盖一次章。
  const knock = async () => {
    const root = grid.current
    const frame = ring.current
    if (busy || !root || !frame) return
    const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')]
    if (cards.length === 0) return
    setBusy(true)
    setToastOpen(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const light = (card: HTMLElement) => cards.forEach((item) => (item === card ? (item.dataset.lit = '') : delete item.dataset.lit))
    cards.forEach((card) => delete card.dataset.picked)
    const target = Math.floor(Math.random() * cards.length)
    const columns = getComputedStyle(root).gridTemplateColumns.split(' ').length
    root.dataset.dim = ''

    if (reduce || columns === 1) {
      // 单列时一屏放不下所有卡片，改为直接滑到选中的那张，再亮框。
      cards[target].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      await wait(reduce ? 0 : 650)
      moveRing(cards[target], 0)
      light(cards[target])
      frame.dataset.on = ''
    } else {
      const top = root.getBoundingClientRect().top
      if (top < 0 || top > window.innerHeight * 0.4) {
        root.scrollIntoView({ behavior: 'smooth', block: 'start' })
        await wait(500)
      }
      const begin = Math.floor(Math.random() * cards.length)
      const steps = cards.length + ((target - begin + cards.length) % cards.length)
      moveRing(cards[begin], 0)
      light(cards[begin])
      frame.getBoundingClientRect()
      frame.dataset.on = ''
      await wait(240)
      for (let step = 1; step <= steps; step += 1) {
        // 间隔按 t^2.4 增长：开头轻快，最后两三家明显放慢，像在犹豫
        const ms = Math.round(80 + 560 * (step / steps) ** 2.4)
        const card = cards[(begin + step) % cards.length]
        moveRing(card, ms, step === steps ? 'var(--spring)' : 'var(--glide)')
        light(card)
        await wait(step === steps ? ms * 0.7 : ms)
      }
    }

    const card = cards[target]
    // 落在屏幕下缘的卡会被结果条挡住，先把它挪到视口中间
    const box = card.getBoundingClientRect()
    if (box.bottom > window.innerHeight - 96 || box.top < 0) {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      await wait(reduce ? 0 : 520)
    }
    card.dataset.picked = ''
    if (!reduce) restamp(card)
    setLanded(publicFriends[Number(card.dataset.card)] ?? null)
    await wait(reduce ? 0 : 760)
    setToastOpen(true)
    setBusy(false)
    await wait(reduce ? 0 : 1400)
    delete frame.dataset.on
    delete root.dataset.dim
    cards.forEach((item) => delete item.dataset.lit)
  }

  const closeToast = () => {
    setToastOpen(false)
    grid.current?.querySelectorAll<HTMLElement>('[data-picked]').forEach((card) => delete card.dataset.picked)
  }

  useEffect(() => {
    const onResize = () => {
      const lit = grid.current?.querySelector<HTMLElement>('[data-lit]')
      if (lit && ring.current?.dataset.on !== undefined) moveRing(lit, 0)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const selfRows: [string, string, boolean][] = [
    ['站名', self.name, false],
    ['地址', self.url, true],
    ['头像', self.avatar, true],
    ['一句话', self.motto, false],
  ]
  const done = () => setEditing(null)

  return (
    <article className={styles.page}>
      <section className={`${listing.head} ${styles.head}`}>
        <div className={listing.headText}>
          <h1>友邻。</h1>
          <span>写字的人，彼此寄一封信。这里是我常去串门的地方，每张明信片上的邮戳，是我们认识的那一天。</span>
        </div>
        {/* 统计和串门按钮叠成一组放在右侧，头部只占一行，把位置让给明信片 */}
        {publicFriends.length > 0 && (
          <div className={styles.headSide}>
            <p className={styles.ledger} aria-label="统计">
              <b>{publicFriends.length}</b> 封来信 · 第一封 <b>{earliestMetMonth(publicFriends.map((friend) => friend.metAt))}</b>
            </p>
            {!editMode && (
              <button className={styles.knock} type="button" aria-busy={busy} title="让邮差替你挑一扇门" onClick={knock}>
                <span className={styles.seal} aria-hidden="true">
                  叩
                </span>
                随便敲一扇门
              </button>
            )}
          </div>
        )}
      </section>

      <section className={styles.grid} ref={grid} aria-label="友链列表">
        {shown.map((friend, index) =>
          editMode && editing === friend.id ? (
            <FriendForm friend={friend} onDone={done} key={friend.id} />
          ) : editMode ? (
            <article className={`${styles.card} ${friend.isVisible ? '' : styles.hiddenCard}`} style={{ '--tilt': `${friendTilt(friend.url)}deg` } as CSSProperties} data-card={index} key={friend.id}>
              <CardBody friend={friend} index={index} />
              <FriendControls friend={friend} index={index} total={shown.length} onEdit={() => setEditing(friend.id)} />
            </article>
          ) : (
            <a className={styles.card} href={friend.url} target="_blank" rel="noopener" style={{ '--tilt': `${friendTilt(friend.url)}deg` } as CSSProperties} data-card={index} key={friend.id}>
              <CardBody friend={friend} index={index} />
            </a>
          ),
        )}
        {editMode &&
          (editing === 'new' ? (
            <FriendForm onDone={done} />
          ) : (
            <button className={`${usesStyles.addCard} ${styles.addCard}`} type="button" onClick={() => setEditing('new')}>
              <Icon name="plus" />
              添加友邻
            </button>
          ))}
        <div className={styles.focusRing} ref={ring} aria-hidden="true" />
      </section>

      {!editMode && shown.length === 0 && (
        <section className={archiveStyles.empty}>
          <h2>还没有友邻</h2>
          <p>第一张明信片会出现在这里。想交换友链的话，欢迎在下面留言。</p>
        </section>
      )}

      <section className={styles.letterWrap} aria-labelledby="friends-apply-title">
        <div>
          <h2 id="friends-apply-title">想交换一封信？</h2>
          <p className={styles.lede}>欢迎同样在认真写字的你。把右边这张信纸上的信息加到你的友链里，然后在下面留言告诉我你的站点，我会尽快回信。</p>
          <ol className={styles.rules}>
            <li>原创内容为主，近半年仍有更新</li>
            <li>全站 HTTPS，能在国内正常打开</li>
            <li>没有违法、灰产、大段广告内容</li>
            <li>长期打不开的站点会先隐藏，恢复后放回原处</li>
          </ol>
        </div>
        <div>
          {editMode && editing === 'letter' && card && cardDefaults ? (
            <FriendCardForm card={card} defaults={cardDefaults} onDone={done} />
          ) : (
            <div className={styles.letter}>
              <svg className={styles.selfMark} viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <path id="friends-self-ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                </defs>
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <text fontSize="9.5" letterSpacing="2.6" fontWeight="600">
                  <textPath href="#friends-self-ring">{`${friendDomain(self.url).toUpperCase()} · 寄出 ·`}</textPath>
                </text>
                <text x="50" y="55" textAnchor="middle" fontSize="15" fontWeight="700">
                  回信
                </text>
              </svg>
              <p className={styles.salute}>致新朋友：</p>
              <dl>
                {selfRows.map(([label, value, mono]) => (
                  <div className={styles.row} key={label}>
                    <dt>{label}</dt>
                    <dd>{mono ? <code>{value}</code> : value}</dd>
                    <CopyButton className={styles.copy} value={value} label={label} idle="复制" done="已复制" />
                  </div>
                ))}
              </dl>
              <div className={styles.letterFoot}>
                <span className={styles.sign}>—— {self.author}</span>
                <CopyButton
                  className={styles.copyAll}
                  value={selfRows.map(([label, value]) => `${label}：${value}`).join('\n')}
                  label="全部信息"
                  idle="复制全部信息"
                  done="已复制，去贴上吧"
                />
              </div>
              {editMode && (
                <div className={`${usesStyles.controls} ${styles.controls}`} role="group" aria-label="管理信纸">
                  <button type="button" onClick={() => setEditing('letter')}>
                    编辑信纸
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 留言单独成一节，和文章页的「读者互动」同一套表头 */}
      <section className={`${archiveStyles.engagement} ${styles.mailbox}`} aria-labelledby="friends-mailbox-title">
        <div className={archiveStyles.engagementHeader}>
          <div>
            <p>来信</p>
            <h2 id="friends-mailbox-title">在这里留下你的站点</h2>
          </div>
        </div>
        <FriendsComments />
      </section>

      <div className={styles.toast} data-open={toastOpen ? '' : undefined} role="status" aria-live="polite">
        <span className={styles.toastMark} aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <text x="20" y="24.5" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700">
              到
            </text>
          </svg>
        </span>
        <span className={styles.toastText}>
          {landed && (
            <>
              邮差停在了「<b>{landed.name}</b>」门口
            </>
          )}
        </span>
        {landed && (
          <a href={landed.url} target="_blank" rel="noopener" tabIndex={toastOpen ? 0 : -1}>
            前往<span className={styles.toastDomain}>{friendDomain(landed.url)}</span>
            <span className={styles.arrow}>↗</span>
          </a>
        )}
        <button type="button" aria-label="关闭" tabIndex={toastOpen ? 0 : -1} onClick={closeToast}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {canEdit && (
        <button
          className={usesStyles.editToggle}
          type="button"
          aria-pressed={editMode}
          onClick={() => {
            setEditMode((value) => !value)
            setEditing(null)
            closeToast()
          }}
        >
          <Icon name={editMode ? 'published' : 'edit'} />
          {editMode ? '完成' : '编辑'}
        </button>
      )}
    </article>
  )
}
