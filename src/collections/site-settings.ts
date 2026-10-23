import type { CollectionConfig } from 'payload';
import { ownerOnly } from './access';

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: { useAsTitle: 'siteName' },
  access: { create: ownerOnly, read: ownerOnly, update: ownerOnly, delete: () => false },
  indexes: [{ fields: ['owner'], unique: true }],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'siteName', type: 'text', required: true, maxLength: 16, defaultValue: '苏码玩家' },
    { name: 'authorName', type: 'text', required: true, maxLength: 24, defaultValue: 'Sue' },
    { name: 'tagline', type: 'text', required: true, maxLength: 60, defaultValue: '一个程序员的折腾记录：Apple 生态、家庭网络、出海基建，还有 AI。' },
    { name: 'authorBio', type: 'textarea', required: true, maxLength: 250, defaultValue: '我喜欢折腾。遇到感兴趣的东西，就自己动手试一遍，试明白了再写下来。' },
    // 友邻页「致新朋友」信纸上给别人抄的本站信息；留空时用站点名称、网站地址、网站图标和标语第一句。
    { name: 'friendCardName', type: 'text', maxLength: 40 },
    { name: 'friendCardUrl', type: 'text', maxLength: 500 },
    { name: 'friendCardAvatar', type: 'text', maxLength: 500 },
    { name: 'friendCardMotto', type: 'text', maxLength: 40 },
  ],
};
