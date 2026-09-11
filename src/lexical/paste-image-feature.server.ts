import { createServerFeature } from '@payloadcms/richtext-lexical';

export const PasteImageFeature = createServerFeature({
  feature: {
    ClientFeature: '/lexical/paste-image-feature.client#PasteImageFeatureClient',
  },
  key: 'pasteImage',
});
