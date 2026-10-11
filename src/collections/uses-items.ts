import type { CollectionConfig } from 'payload'
import { ownerOnly, signedInOnly } from './access'

export const UsesItems: CollectionConfig = {
  slug: 'uses-items',
  labels: { singular: '在用条目', plural: '在用条目' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'isAffiliate', 'sortOrder', 'isVisible'],
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
    {
      name: 'category',
      label: '分类',
      type: 'relationship',
      relationTo: 'uses-categories',
      required: true,
      index: true,
    },
    { name: 'title', label: '名称', type: 'text', required: true, maxLength: 80 },
    { name: 'tagline', label: '一句卖点', type: 'text', maxLength: 80 },
    { name: 'tags', label: '标签', type: 'text', maxLength: 120, admin: { description: '多个标签用顿号或逗号分隔。' } },
    { name: 'description', label: '说明', type: 'textarea', required: true, maxLength: 600, admin: { description: '重点词写成 **这样** 会显示为粗体。' } },
    {
      name: 'status',
      label: '使用状态',
      type: 'select',
      required: true,
      defaultValue: 'using',
      options: [
        { label: '在用', value: 'using' },
        { label: '用过', value: 'used' },
      ],
    },
    { name: 'href', label: '访问地址', type: 'text', maxLength: 500, admin: { description: '留空时卡片不显示按钮，适合自己攒的设备这类没有官网的条目。' } },
    { name: 'ctaLabel', label: '按钮文字', type: 'text', required: true, maxLength: 12, defaultValue: '去官网' },
    {
      name: 'isAffiliate',
      label: '邀请链接',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    { name: 'promoNote', label: '优惠说明', type: 'text', maxLength: 200 },
    { name: 'logoUrl', label: 'Logo 图片地址', type: 'text', maxLength: 500 },
    { name: 'relatedLinks', label: '相关文章', type: 'json', admin: { description: '[{ "label": "标题", "href": "链接" }]' } },
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
