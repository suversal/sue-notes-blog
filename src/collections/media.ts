import type { CollectionConfig } from 'payload';
import { uploadImageToImgBed } from '../lib/imgbed';
import { ownerOnly, signedInOnly } from './access';

/**
 * 文章内嵌图片专用 collection。它与私有 S3 资产分开，避免把 ImgBed 的公开 URL
 * 误当作私有文件；Lexical 的 upload 节点只关联这里的记录。
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: '文章图片', plural: '文章图片' },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mimeType', 'filesize', 'createdAt'],
  },
  access: { create: signedInOnly, read: ownerOnly, update: ownerOnly, delete: () => false },
  upload: {
    adapter: 'imgbed',
    bulkUpload: false,
    crop: false,
    disableLocalStorage: true,
    displayPreview: true,
    focalPoint: false,
    mimeTypes: ['image/*'],
    pasteURL: false,
  },
  hooks: {
    beforeChange: [async ({ data, req }) => {
      const owner = data.owner || req.user?.id;
      if (!owner) throw new Error('图片必须属于已登录用户。');
      if (!req.file) return { ...data, owner };

      const uploaded = await uploadImageToImgBed(req.file);
      return {
        ...data,
        owner,
        sha256: uploaded.sha256,
        storageKey: uploaded.storageKey,
        url: uploaded.publicUrl,
        provider: 'imgbed',
        uploadedAt: new Date().toISOString(),
      };
    }],
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { hidden: true } },
    { name: 'alt', type: 'text', label: '图片说明', required: true, maxLength: 240, admin: { description: '简短描述图片内容，供读屏和 Markdown 导出使用。' } },
    { name: 'provider', type: 'select', required: true, defaultValue: 'imgbed', options: [{ label: 'ImgBed', value: 'imgbed' }], admin: { hidden: true } },
    { name: 'storageKey', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'sha256', type: 'text', required: true, index: true, admin: { hidden: true } },
    { name: 'uploadedAt', type: 'date', required: true, admin: { hidden: true } },
  ],
};
