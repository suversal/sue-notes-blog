import type { CollectionConfig } from 'payload';
import { uploadMediaToImgBed } from '../lib/imgbed';
import { ownerOnly, signedInOnly } from './access';

/**
 * 文章内嵌图片和视频。文件存放 ImgBed，正文通过媒体 ID 关联持久记录。
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: '文章媒体', plural: '文章媒体' },
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
    mimeTypes: ['image/*', 'video/mp4'],
    pasteURL: false,
  },
  hooks: {
    beforeChange: [async ({ data, req }) => {
      const owner = data.owner || req.user?.id;
      if (!owner) throw new Error('媒体必须属于已登录用户。');
      if (!req.file) return { ...data, owner };

      const uploaded = await uploadMediaToImgBed(req.file);
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
    { name: 'alt', type: 'text', label: '媒体说明', required: true, maxLength: 240, admin: { description: '简短描述图片或视频内容，供读屏和导出使用。' } },
    { name: 'provider', type: 'select', required: true, defaultValue: 'imgbed', options: [{ label: 'ImgBed', value: 'imgbed' }], admin: { hidden: true } },
    { name: 'storageKey', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'sha256', type: 'text', required: true, index: true, admin: { hidden: true } },
    { name: 'uploadedAt', type: 'date', required: true, admin: { hidden: true } },
  ],
};
