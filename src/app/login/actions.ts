'use server';

import { login, logout } from '@payloadcms/next/auth';
import { redirect } from 'next/navigation';
import { getPayloadConfig } from '../../lib/payload';

export async function signIn(formData: FormData) {
  const account = String(formData.get('email') ?? '').trim();
  const ownerAlias = process.env.OWNER_LOGIN_ALIAS?.trim() || 'admin';
  const email = account.toLowerCase() === ownerAlias.toLowerCase() ? 'admin@local.test' : account;
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
