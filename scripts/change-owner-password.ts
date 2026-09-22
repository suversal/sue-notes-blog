import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { closeSync, openSync, readSync } from 'node:fs';
import 'dotenv/config';

assert(process.stdin.isTTY, '请在交互终端中运行，密码不能通过管道输入。');

const tty = openSync('/dev/tty', 'r+');
const restoreEcho = () => execFileSync('stty', ['echo'], { stdio: [tty, 'ignore', 'ignore'] });
const hideEcho = () => execFileSync('stty', ['-echo'], { stdio: [tty, 'ignore', 'ignore'] });
const onInterrupt = () => {
  restoreEcho();
  process.exit(130);
};

function readHiddenLine(prompt: string): string {
  process.stdout.write(prompt);
  const bytes: number[] = [];
  const byte = Buffer.alloc(1);
  while (readSync(tty, byte, 0, 1, null) === 1) {
    if (byte[0] === 10) break;
    if (bytes.length >= 1024) throw new Error('密码输入过长。');
    bytes.push(byte[0]);
  }
  process.stdout.write('\n');
  return Buffer.from(bytes).toString('utf8').replace(/\r$/, '');
}

let password = '';
try {
  hideEcho();
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);
  password = readHiddenLine('新密码（至少 12 个字符）：');
  const confirmation = readHiddenLine('再次输入新密码：');
  assert(password.length >= 12, '新密码至少需要 12 个字符。');
  assert.equal(password, confirmation, '两次输入的密码不一致。');
} finally {
  restoreEcho();
  process.off('SIGINT', onInterrupt);
  process.off('SIGTERM', onInterrupt);
  closeSync(tty);
}

const { getPayloadClient } = await import('../src/lib/payload.js');
const payload = await getPayloadClient();
try {
  const email = 'admin@local.test';
  const users = await payload.find({ collection: 'users', overrideAccess: true, limit: 2, where: { email: { equals: email } } });
  assert.equal(users.docs.length, 1, '未找到唯一的所有者账户，已停止改密。');
  await payload.update({ collection: 'users', id: users.docs[0].id, overrideAccess: true, data: { password, displayName: 'Sue' } });
  await payload.login({ collection: 'users', data: { email, password } });
  console.info('Sue 的密码已更新并验证成功。');
} finally {
  await payload.db.destroy?.();
}
