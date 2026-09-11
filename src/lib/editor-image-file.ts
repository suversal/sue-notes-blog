export type EditorImageFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
};

/**
 * Files returned by Request.formData() can come from a different Web API realm
 * than globalThis.File. Check the interface we actually consume instead of
 * relying on instanceof, which rejects otherwise valid multipart uploads.
 */
export function isEditorImageFile(value: unknown): value is EditorImageFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EditorImageFile>;
  return typeof candidate.arrayBuffer === 'function'
    && typeof candidate.name === 'string'
    && typeof candidate.size === 'number'
    && candidate.size > 0
    && typeof candidate.type === 'string';
}
