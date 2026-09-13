import type { CollectionConfig } from 'payload'

export const ArticleViewDays: CollectionConfig = {
  slug: 'article-view-days',
  admin: { hidden: true },
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  indexes: [{ fields: ['pageKey', 'dayKey'], unique: true }],
  lockDocuments: false,
  timestamps: false,
  fields: [
    { name: 'pageKey', type: 'text', required: true, index: true, maxLength: 240 },
    { name: 'dayKey', type: 'text', required: true, index: true, maxLength: 10 },
    { name: 'views', type: 'number', required: true, defaultValue: 0, min: 0 },
  ],
}
