import type { CollectionConfig } from 'payload';

export const PublishApprovals: CollectionConfig = {
  slug: 'publish-approvals', admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['article', 'revisionHash', 'usedAt'] }],
  fields: [
    { name: 'article', type: 'relationship', relationTo: 'articles', required: true },
    // 历史批准记录在 M4 前没有版本列；服务层对新记录强制写入，schema 保留兼容迁移空间。
    { name: 'revision', type: 'relationship', relationTo: 'article-revisions' },
    { name: 'revisionHash', type: 'text', required: true }, { name: 'expiresAt', type: 'date', required: true }, { name: 'usedAt', type: 'date' },
  ],
};
