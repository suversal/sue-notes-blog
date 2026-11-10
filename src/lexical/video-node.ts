import { DecoratorBlockNode, type SerializedDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import { $applyNodeReplacement, type NodeKey } from 'lexical';
import type { Media } from '../payload-types';
import type { JSX } from 'react';

export type VideoFields = { media: string | Media };
export type SerializedVideoNode = SerializedDecoratorBlockNode & {
  type: 'article-video';
  id: string;
  fields: VideoFields;
};

/** The upload subfield is populated and depopulated by Payload's field hooks. */
export class VideoServerNode extends DecoratorBlockNode {
  __fields: VideoFields;
  __id: string;

  static getType() { return 'article-video'; }
  static clone(node: VideoServerNode) { return new this(node.__fields, node.__id, node.__key); }
  static importJSON(node: SerializedVideoNode) {
    return $applyNodeReplacement(new VideoServerNode(node.fields, node.id)).updateFromJSON(node);
  }
  constructor(fields: VideoFields, id: string, key?: NodeKey) {
    super('', key);
    this.__fields = fields;
    this.__id = id;
  }
  createDOM() {
    const element = document.createElement('div');
    element.className = 'article-video-node';
    return element;
  }
  updateDOM(): false { return false; }
  decorate(): JSX.Element | null { return null; }
  getFields() { return this.getLatest().__fields; }
  exportJSON(): SerializedVideoNode {
    return { ...super.exportJSON(), type: 'article-video', id: this.getLatest().__id, fields: this.getFields(), version: 1 };
  }
  exportDOM() {
    const element = document.createElement('video');
    const media = this.getFields().media;
    element.setAttribute('data-article-video-id', typeof media === 'object' ? media.id : media);
    element.setAttribute('controls', '');
    if (typeof media === 'object' && media.url) element.setAttribute('src', media.url);
    return { element };
  }
}
