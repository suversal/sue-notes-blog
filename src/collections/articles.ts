import type { CollectionConfig } from 'payload';
import { articleContentField } from '../lib/article-content';
import { ownerOnly } from './access';

export const Articles: CollectionConfig = {
  slug: 'articles', admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'visibility', 'updatedAt'] },
  access: { create: ownerOnly, read: ownerOnly, update: ownerOnly, delete: () => false },
  indexes: [{ fields: ['owner', 'slug'], unique: true }, { fields: ['visibility', 'status', 'slug'], unique: true }, { fields: ['publishedSlug'], unique: true }],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'title', type: 'text', required: true, maxLength: 180 }, { name: 'slug', type: 'text', required: true, maxLength: 180 },
    { name: 'excerpt', type: 'textarea', maxLength: 500 }, articleContentField,
    { name: 'topic', type: 'relationship', relationTo: 'topics', index: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'coverStyle', type: 'select', options: ['none', 'notes', 'grid', 'cache'], defaultValue: 'none' },
    { name: 'tags', type: 'array', maxRows: 20, fields: [{ name: 'value', type: 'text', required: true, maxLength: 64 }] },
    { name: 'publicReferences', type: 'array', maxRows: 20, fields: [{ name: 'label', type: 'text', required: true, maxLength: 160 }, { name: 'url', type: 'text', required: true, maxLength: 2_048 }] },
    { name: 'visibility', type: 'select', required: true, options: ['private', 'public'], defaultValue: 'private' },
    { name: 'status', type: 'select', required: true, options: ['draft', 'published', 'archived'], defaultValue: 'draft' },
    { name: 'pinPriority', type: 'number', min: 1, max: 999, index: true, admin: { description: '留空表示不置顶；数字越小，首页排序越靠前。' } },
    { name: 'sourceUrl', type: 'text', maxLength: 500, admin: { description: '这篇文章在 X 上的原文链接。留空则前台不显示入口。' } },
    { name: 'revisionHash', type: 'text', required: true },
    { name: 'currentRevision', type: 'relationship', relationTo: 'article-revisions' },
    { name: 'publishedRevision', type: 'relationship', relationTo: 'article-revisions' },
    { name: 'publishedAt', type: 'date' }, { name: 'publishedSlug', type: 'text', maxLength: 180, index: true }, { name: 'privateAt', type: 'date' },
  ],
};
