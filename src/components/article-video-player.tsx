'use client';

import { useState } from 'react';
import styles from './article-video-player.module.css';

export function ArticleVideoPlayer({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.player}>
    <video aria-label={title} controls playsInline preload="metadata" src={src} onError={() => setFailed(true)}>
      浏览器无法播放此视频。<a href={src}>打开视频文件</a>
    </video>
    {failed && <p role="status">视频加载失败或编码不受支持。<a href={src} target="_blank" rel="noopener noreferrer">打开视频文件</a></p>}
  </div>;
}
