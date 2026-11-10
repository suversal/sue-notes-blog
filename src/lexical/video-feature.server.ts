import { createNode, createServerFeature } from '@payloadcms/richtext-lexical';
import { sanitizeFields, type Config } from 'payload';
import { VideoServerNode } from './video-node';

export const VideoFeature = createServerFeature({
  key: 'articleVideo',
  feature: async ({ config, isRoot, parentIsLocalized }) => {
    const fields = await sanitizeFields({
      config: config as unknown as Config,
      fields: [{ name: 'media', type: 'upload', relationTo: 'media', required: true, filterOptions: { mimeType: { equals: 'video/mp4' } } }],
      parentIsLocalized,
      requireFieldLevelRichTextEditor: isRoot,
      validRelationships: config.collections.map(({ slug }) => slug),
    });
    return {
      ClientFeature: '/lexical/video-feature.client#VideoFeatureClient',
      nodes: [createNode({
        node: VideoServerNode,
        getSubFields: () => fields,
        getSubFieldsData: ({ node }) => node?.fields,
      })],
    };
  },
});
