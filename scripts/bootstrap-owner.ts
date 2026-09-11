import assert from 'node:assert/strict';
import 'dotenv/config';

const email = process.env.INITIAL_OWNER_EMAIL?.trim();
const password = process.env.INITIAL_OWNER_PASSWORD;
assert(email, '缺少 INITIAL_OWNER_EMAIL。');
assert(password && password.length >= 12, 'INITIAL_OWNER_PASSWORD 至少需要 12 个字符。');

const { getPayloadClient } = await import('../src/lib/payload.js');
const payload = await getPayloadClient();
try {
  const existing = await payload.count({ collection: 'users', overrideAccess: true });
  assert.equal(existing.totalDocs, 0, '已有用户；为避免覆盖，初始化已拒绝。');
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, displayName: 'Owner' } });
  console.info(`已创建私有知识库所有者：${email}`);
} finally {
  await payload.db.destroy?.();
}
