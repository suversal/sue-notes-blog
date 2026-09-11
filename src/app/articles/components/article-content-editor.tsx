'use client';

import { RenderLexical } from '@payloadcms/richtext-lexical/client';
import { useEffect, useRef } from 'react';
import type { ArticleContent } from '../../../lib/article-content-data';
import { EDITOR_IMPORT_STATE_EVENT } from '../../../lexical/paste-image-feature.client';
import styles from '../admin-v1.module.css';

export function ArticleContentEditor({ value, onChange, onImportStateChange }: { value: ArticleContent; onChange: (value: ArticleContent) => void; onImportStateChange?: (busy: boolean) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element || !onImportStateChange) return;
    const listener = (event: Event) => onImportStateChange(Boolean((event as CustomEvent<{ busy?: boolean }>).detail?.busy));
    element.addEventListener(EDITOR_IMPORT_STATE_EVENT, listener);
    return () => element.removeEventListener(EDITOR_IMPORT_STATE_EVENT, listener);
  }, [onImportStateChange]);

  return <div ref={container} className={styles.lexicalEditor}>
    <RenderLexical
      field={{ name: 'content', label: '正文' }}
      path="content"
      schemaPath="collection.articles.content"
      value={value}
      setValue={(next) => { if (next) onChange(next as ArticleContent); }}
      Loading={<p className={styles.editorLoading} role="status">正在加载编辑器…</p>}
    />
  </div>;
}
