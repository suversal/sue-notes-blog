import Link from 'next/link';
import { signIn } from './actions';
import { SubmitButton } from '../components/submit-button';
import { PasswordField } from './password-field';
import styles from './styles.module.css';

const messages: Record<string, string> = {
  missing: '请输入邮箱和密码。',
  invalid: '邮箱或密码不正确。',
  created: '账户已创建，请使用刚才设置的邮箱和密码登录。',
  'already-configured': '账户已经创建，请使用已有邮箱和密码登录。',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  const message = error ? messages[error] ?? '无法登录，请稍后重试。' : notice ? messages[notice] : undefined;
  return (
    <main id="main-content" tabIndex={-1} className={styles.shell}>
      <section className={styles.panel} aria-labelledby="login-title">
        <p className={styles.eyebrow}>WRITING STUDIO</p>
        <h1 id="login-title">回到写作后台</h1>
        <p className={styles.intro}>继续编辑私有草稿，预览并确认将要公开的文章。</p>
        <form action={signIn} className={styles.form}>
          <label htmlFor="email">账号或邮箱</label>
          <input id="email" name="email" type="text" autoComplete="username" aria-describedby="login-hint" required />
          <label htmlFor="password">密码</label>
          <PasswordField id="password" autoComplete="current-password" describedBy="login-hint" fieldClassName={styles.passwordField ?? ''} toggleClassName={styles.passwordToggle ?? ''} />
          <p id="login-hint" className={styles.hint}>支持密码管理器自动填充，也可直接粘贴密码。</p>
          {message && <p className={error ? styles.error : styles.notice} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>{message}</p>}
          <SubmitButton pendingText="正在登录…">进入写作后台</SubmitButton>
        </form>
        <Link className={styles.back} href="/">返回首页</Link>
        <Link className={styles.back} href="/setup">首次使用，创建账户</Link>
      </section>
    </main>
  );
}
