import type { CollectionConfig } from 'payload'
import { exploreKindLabels } from '../lib/explore-labels'
import { ownerOnly, signedInOnly } from './access'

export const ExploreItems: CollectionConfig = {
  slug: 'explore-items',
  labels: { singular: '探索条目', plural: '探索条目' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'status', 'sortOrder', 'isVisible'],
  },
  defaultSort: 'sortOrder',
  access: {
    create: signedInOnly,
    read: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const kind = data?.kind as keyof typeof exploreKindLabels | undefined
        return kind ? { ...data, eyebrow: exploreKindLabels[kind] } : data
      },
    ],
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
      name: 'kind',
      label: '分类',
      type: 'select',
      required: true,
      options: [
        { label: '开源项目', value: 'project' },
        { label: '我的站点', value: 'site' },
        { label: '收藏', value: 'saved' },
      ],
    },
    { name: 'eyebrow', label: '分类标签', type: 'text', required: true, maxLength: 40, admin: { hidden: true } },
    { name: 'title', label: '名称', type: 'text', required: true, maxLength: 80 },
    { name: 'description', label: '简介', type: 'textarea', required: true, maxLength: 240 },
    { name: 'meta', label: '标签或补充信息', type: 'text', maxLength: 100, admin: { description: '开源项目填标签（用顿号分隔）；站点填域名；收藏填类型。' } },
    { name: 'status', label: '状态文字', type: 'text', maxLength: 40 },
    { name: 'href', label: '访问地址', type: 'text', required: true, maxLength: 500 },
    { name: 'logoUrl', label: '图标地址', type: 'text', maxLength: 500 },
    { name: 'relatedLinks', label: '相关文章', type: 'json', admin: { description: '[{ "label": "标题", "href": "链接" }]' } },
    {
      name: 'isFeatured',
      label: '重点项目',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    {
      name: 'highlightStatus',
      label: '突出显示状态',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
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
