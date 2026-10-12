'use server';

import { redirect } from 'next/navigation';
import { getPayloadClient } from '../../../lib/payload';

export async function createInitialOwner(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || password.length < 12) redirect('/setup?error=invalid');
  const payload = await getPayloadClient();
  if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs > 0) redirect('/login?error=already-configured');
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, displayName: 'Owner' } });
  redirect('/login?notice=created');
}
