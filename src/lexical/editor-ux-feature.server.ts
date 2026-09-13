import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { CODE } from '@lexical/markdown';
import { createNode, createServerFeature } from '@payloadcms/richtext-lexical';

export const EditorUxFeature = createServerFeature({
  feature: {
    ClientFeature: '/lexical/editor-ux-feature.client#EditorUxFeatureClient',
    markdownTransformers: [CODE],
    nodes: [createNode({ node: CodeNode }), createNode({ node: CodeHighlightNode })],
  },
  key: 'editorUx',
});
