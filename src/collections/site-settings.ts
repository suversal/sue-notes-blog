import type { CollectionConfig } from 'payload';
import { ownerOnly } from './access';

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: { useAsTitle: 'siteName' },
  access: { create: ownerOnly, read: ownerOnly, update: ownerOnly, delete: () => false },
  indexes: [{ fields: ['owner'], unique: true }],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'siteName', type: 'text', required: true, maxLength: 16, defaultValue: '苏码手记' },
    { name: 'authorName', type: 'text', required: true, maxLength: 24, defaultValue: 'Sue' },
    { name: 'tagline', type: 'text', required: true, maxLength: 60, defaultValue: '关于工具、创造，以及认真生活的小事。' },
    { name: 'authorBio', type: 'textarea', required: true, maxLength: 250, defaultValue: '一个爱折腾工具的独立开发者。把亲手做过的事、慢慢想明白的问题，写在这里。' },
  ],
};
