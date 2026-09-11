import type { CollectionConfig } from 'payload';
import { ownerOnly } from './access';

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'isSystem', 'updatedAt'] },
  access: { create: ownerOnly, read: ownerOnly, update: ownerOnly, delete: ownerOnly },
  indexes: [{ fields: ['owner', 'normalizedName'], unique: true }],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true, maxLength: 20 },
    { name: 'normalizedName', type: 'text', required: true, maxLength: 40 },
    { name: 'isSystem', type: 'checkbox', required: true, defaultValue: false },
  ],
};
