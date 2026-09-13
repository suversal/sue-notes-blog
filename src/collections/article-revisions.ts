import type { CollectionConfig } from 'payload';
import { articleContentField } from '../lib/article-content';

export const ArticleRevisions: CollectionConfig = {
  slug: 'article-revisions',
  admin: { hidden: true },
  access: { create: () => false, read: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['article', 'revisionNumber'], unique: true }, { fields: ['article', 'revisionHash'], unique: true }],
  fields: [
    { name: 'article', type: 'relationship', relationTo: 'articles', required: true, index: true },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'revisionNumber', type: 'number', required: true, min: 1 },
    { name: 'revisionHash', type: 'text', required: true },
    { name: 'title', type: 'text', required: true, maxLength: 180 },
    { name: 'slug', type: 'text', required: true, maxLength: 180 },
    { name: 'excerpt', type: 'textarea', maxLength: 500 },
    articleContentField,
    { name: 'topic', type: 'relationship', relationTo: 'topics' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'coverStyle', type: 'select', options: ['none', 'notes', 'grid', 'cache'], defaultValue: 'none' },
    { name: 'tags', type: 'array', maxRows: 20, fields: [{ name: 'value', type: 'text', required: true, maxLength: 64 }] },
    { name: 'publicReferences', type: 'array', maxRows: 20, fields: [{ name: 'label', type: 'text', required: true, maxLength: 160 }, { name: 'url', type: 'text', required: true, maxLength: 2_048 }] },
  ],
};
