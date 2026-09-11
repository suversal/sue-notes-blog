import Link from 'next/link';
import { createInitialOwner } from './actions';
import styles from '../login/styles.module.css';
import { SubmitButton } from '../components/submit-button';
import { PasswordField } from '../login/password-field';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  return (
    <main id="main-content" tabIndex={-1} className={styles.shell}><section className={styles.panel} aria-labelledby="setup-title">
      <p className={styles.eyebrow}>FIRST-RUN SETUP</p><h1 id="setup-title">创建你的私有账户</h1>
      <p className={styles.intro}>此页面仅在还没有账户时有效。密码只会保存为安全哈希。</p>
      <form action={createInitialOwner} className={styles.form}>
        <label htmlFor="email">邮箱</label><input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">密码</label><PasswordField id="password" autoComplete="new-password" minLength={12} describedBy="password-hint" fieldClassName={styles.passwordField ?? ''} toggleClassName={styles.passwordToggle ?? ''} />
        <p id="password-hint" className={styles.hint}>至少 12 位；支持密码管理器生成并保存强密码。</p>
        {error && <p className={styles.error} role="alert">密码至少需要 12 位，请补充后重新提交。</p>}<SubmitButton pendingText="正在创建…">创建账户</SubmitButton>
      </form><Link className={styles.back} href="/login">已有账户，去登录</Link>
    </section></main>
  );
}
