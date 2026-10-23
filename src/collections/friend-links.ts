import type { CollectionConfig } from 'payload'
import { ownerOnly, signedInOnly } from './access'

export const FriendLinks: CollectionConfig = {
  slug: 'friend-links',
  labels: { singular: '友邻', plural: '友邻' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'url', 'metAt', 'sortOrder', 'isVisible'],
  },
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
    { name: 'name', label: '站名', type: 'text', required: true, maxLength: 40 },
    { name: 'author', label: '站长', type: 'text', maxLength: 40 },
    { name: 'url', label: '网址', type: 'text', required: true, maxLength: 500 },
    { name: 'avatarUrl', label: '头像地址', type: 'text', maxLength: 500 },
    { name: 'motto', label: '一句话介绍', type: 'text', required: true, maxLength: 80 },
    { name: 'note', label: '推荐语', type: 'text', maxLength: 120 },
    // 邮戳上的「结识于」日期，按 YYYY-MM-DD 存成文本，避免时区换算把日期挪一天。
    { name: 'metAt', label: '结识日期', type: 'text', required: true, maxLength: 10 },
    {
      name: 'isVisible',
      label: '前台显示',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      index: true,
    },
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
