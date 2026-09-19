const imageExtension = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const attachmentDirectoryNames = new Set(['assets', 'asserts']);

export type ObsidianFolderFile = {
  name: string;
  webkitRelativePath: string;
};

export function pathInsideSelectedFolder(relativePath: string) {
  const parts = relativePath.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join('/') : parts[0] ?? '';
}

export function inspectObsidianFolder<T extends ObsidianFolderFile>(files: T[]) {
  const rootNames = new Set(files.map((file) => file.webkitRelativePath.split('/')[0]).filter(Boolean));
  if (rootNames.size !== 1) throw new Error('请选择一个完整的 Obsidian 文章目录。');
  const rootName = [...rootNames][0]!;
  const markdownFiles = files
    .filter((file) => {
      const relativePath = pathInsideSelectedFolder(file.webkitRelativePath);
      return !relativePath.includes('/') && relativePath.toLowerCase().endsWith('.md');
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  const attachmentDirectories = [...new Set(files.flatMap((file) => {
    const directory = pathInsideSelectedFolder(file.webkitRelativePath).split('/')[0];
    return attachmentDirectoryNames.has(directory) ? [directory] : [];
  }))].sort();
  const imageFiles = files.filter((file) => {
    const relativePath = pathInsideSelectedFolder(file.webkitRelativePath);
    return attachmentDirectoryNames.has(relativePath.split('/')[0] ?? '') && imageExtension.test(file.name);
  });
  return { attachmentDirectories, imageFiles, markdownFiles, rootName };
}

export function normalizeObsidianAttachmentSource(source: string) {
  const rawPath = source.trim().split(/[?#]/, 1)[0] ?? '';
  if (!rawPath || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(rawPath) || rawPath.includes('\\')) return null;
  try {
    const decoded = decodeURIComponent(rawPath).replace(/^\.\//, '');
    const parts = decoded.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..')) return null;
    return attachmentDirectoryNames.has(parts[0] ?? '') ? parts.join('/') : null;
  } catch {
    return null;
  }
}
