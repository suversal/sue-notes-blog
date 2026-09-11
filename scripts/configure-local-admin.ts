import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const envFile of [resolve(appRoot, '.env.local'), resolve(appRoot, '.env')]) {
  try { loadEnvFile(envFile); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

const email = process.env.LOCAL_ADMIN_EMAIL?.trim() || 'admin@local.test';
const password = process.env.LOCAL_ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
assert(databaseUrl, '必须提供 DATABASE_URL。');
const databaseHostname = new URL(databaseUrl).hostname;
const isLoopbackDatabase = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseHostname);
const isLocalShortcut = process.env.NODE_ENV !== 'production'
  && email === 'admin@local.test'
  && isLoopbackDatabase;

assert(password, '必须提供 LOCAL_ADMIN_PASSWORD。');
assert(
  isLocalShortcut || password.length >= 12,
  '非本地测试账户的 LOCAL_ADMIN_PASSWORD 至少需要 12 个字符。',
);

const { getPayloadClient } = await import('../src/lib/payload.js');
const payload = await getPayloadClient();
try {
  const existing = await payload.find({ collection: 'users', overrideAccess: true, where: { email: { equals: email } }, limit: 1 });
  if (existing.docs[0]) {
    await payload.update({ collection: 'users', id: existing.docs[0].id, overrideAccess: true, data: { password, displayName: 'Local admin' } });
  } else {
    await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, displayName: 'Local admin' } });
  }
  await payload.login({ collection: 'users', data: { email, password } });
  console.info('本地开发账户已就绪。');
} finally {
  await payload.db.destroy?.();
}
process.exit(0);
