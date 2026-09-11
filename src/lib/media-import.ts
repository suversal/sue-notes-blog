import type { Payload, PayloadRequest } from 'payload';
import { downloadRemoteImage } from './remote-image';

export async function importRemoteMedia({
  alt,
  owner,
  payload,
  req,
  source,
}: {
  alt: string;
  owner: string;
  payload: Payload;
  req: PayloadRequest;
  source: string;
}) {
  const image = await downloadRemoteImage(source);
  const media = await payload.create({
    collection: 'media',
    req,
    data: {
      owner,
      alt: alt.trim().slice(0, 240) || '导入图片',
      provider: 'imgbed',
      storageKey: 'pending',
      sha256: 'pending',
      uploadedAt: new Date().toISOString(),
    },
    file: {
      data: image.data,
      mimetype: image.mimeType,
      name: image.filename,
      size: image.data.length,
    },
  });
  return {
    alt: media.alt,
    filename: media.filename,
    height: media.height,
    id: String(media.id),
    mimeType: media.mimeType,
    url: media.url,
    width: media.width,
  };
}
