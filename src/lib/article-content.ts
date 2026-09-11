import {
  FixedToolbarFeature,
  convertMarkdownToLexical,
  editorConfigFactory,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Payload, RichTextField } from 'payload';
import type { ArticleContent } from './article-content-data';
import { PasteImageFeature } from '../lexical/paste-image-feature.server';

const articleContentEditor = lexicalEditor({
  admin: { placeholder: '开始写正文，输入 / 可插入内容块…' },
  features: ({ defaultFeatures }) => [
    // Payload 3.88 的 Markdown 转换器会在 horizontalRule 节点上触发 Lexical 类身份冲突。
    // 先收窄这一项，保证 Markdown 导入路径可靠；普通分隔可继续用段落或标题层级表达。
    ...defaultFeatures.filter((feature) => feature.key !== 'horizontalRule'),
    PasteImageFeature(),
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
