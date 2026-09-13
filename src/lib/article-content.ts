import {
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  convertMarkdownToLexical,
  editorConfigFactory,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Payload, RichTextField } from 'payload';
import type { ArticleContent } from './article-content-data';
import { PasteImageFeature } from '../lexical/paste-image-feature.server';
import { EditorUxFeature } from '../lexical/editor-ux-feature.server';

const articleContentEditor = lexicalEditor({
  admin: { placeholder: '开始写正文，输入 / 可插入内容块…' },
  features: ({ defaultFeatures }) => [
    // Relationship 在文章正文中没有可用场景，保留入口只会产生一个无法完成的操作。
    ...defaultFeatures.filter((feature) => !['relationship', 'toolbarInline'].includes(feature.key)),
    EXPERIMENTAL_TableFeature(),
    PasteImageFeature(),
    EditorUxFeature(),
    FixedToolbarFeature(),
  ],
});

export const articleContentField: RichTextField = {
  name: 'content',
  type: 'richText',
  required: true,
  editor: articleContentEditor,
};

function editorConfig(payload: Payload) {
  const collection = payload.config.collections.find((item) => item.slug === 'articles');
  const field = collection?.fields.find((item) => 'name' in item && item.name === 'content');
  if (!field || field.type !== 'richText') throw new Error('文章正文编辑器未正确配置。');
  return editorConfigFactory.fromField({ field });
}

export function markdownToArticleContent(payload: Payload, markdown: string): ArticleContent {
  return convertMarkdownToLexical({ editorConfig: editorConfig(payload), markdown });
}
