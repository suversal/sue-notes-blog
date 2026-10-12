import type { Access, CollectionConfig } from 'payload';
import { getServerEnv } from '../lib/env';

/** 账户只能读取和修改自己；新增与删除只走脚本或 /setup，不经 REST。 */
const selfOnly: Access = ({ req }) => (req.user ? { id: { equals: req.user.id } } : false);

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    cookies: { sameSite: 'Lax', secure: getServerEnv().PAYLOAD_SERVER_URL.startsWith('https://') },
    lockTime: 15 * 60_000,
    maxLoginAttempts: 5,
  },
  admin: { useAsTitle: 'email' },
  access: {
    create: () => false,
    delete: () => false,
    read: selfOnly,
    update: selfOnly,
  },
  fields: [
    { name: 'displayName', type: 'text', required: true, maxLength: 120 },
  ],
};
