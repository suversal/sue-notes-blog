'use server';

import { login, logout } from '@payloadcms/next/auth';
import { redirect } from 'next/navigation';
import { getPayloadConfig } from '../../lib/payload';

export async function signIn(formData: FormData) {
  const account = String(formData.get('email') ?? '').trim();
  // 「admin」是本机测试账户的简写，线上不提供这条捷径。
  const email = account === 'admin' && process.env.NODE_ENV !== 'production' ? 'admin@local.test' : account;
  const password = String(formData.get('password') ?? '');
  if (!account || !password) redirect('/login?error=missing');

  try {
    await login({ collection: 'users', config: getPayloadConfig(), email, password });
  } catch {
    redirect('/login?error=invalid');
  }
  redirect('/articles');
}

export async function signOut() {
  await logout({ config: getPayloadConfig() });
  redirect('/login');
}
