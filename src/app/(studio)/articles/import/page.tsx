import Link from 'next/link';
import { Icon } from '../../../(site)/blog/components/ui-icon';
import { ObsidianImportForm } from './obsidian-import-form';
import styles from './import.module.css';

export default function ImportObsidianPage() {
  return <main id="main-content" tabIndex={-1}>
    <div className={styles.breadcrumb}>
      <Link href="/articles"><Icon name="back" />返回文章</Link>
      <span>Obsidian / 单篇导入</span>
    </div>
    <header className={styles.pageHead}>
      <div>
        <p>IMPORT</p>
        <h1>从 Obsidian 导入</h1>
        <span>把 Markdown 和本地图片收进网站，先生成草稿，再决定是否发布。</span>
      </div>
    </header>
    <ObsidianImportForm />
  </main>;
}
