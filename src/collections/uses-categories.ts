import type { CollectionConfig } from 'payload'
import { ownerOnly, signedInOnly } from './access'

export const UsesCategories: CollectionConfig = {
  slug: 'uses-categories',
  labels: { singular: '在用分类', plural: '在用分类' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'sortOrder'] },
  defaultSort: 'sortOrder',
  access: {
    create: signedInOnly,
    read: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => (req.user ? { ...data, owner: req.user.id } : data),
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { hidden: true },
    },
    { name: 'name', label: '分类名称', type: 'text', required: true, maxLength: 20 },
    { name: 'subtitle', label: '副标题', type: 'text', maxLength: 40 },
    { name: 'note', label: '我的搭配', type: 'textarea', maxLength: 240 },
    {
      name: 'sortOrder',
      label: '排序',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      max: 9999,
      index: true,
    },
  ],
}
