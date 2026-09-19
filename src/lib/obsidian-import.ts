import path from 'node:path';
import yauzl, { type Entry, type ZipFile } from 'yauzl';

export const MAX_OBSIDIAN_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 128;
const MAX_ARCHIVE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MARKDOWN_SIZE = 2 * 1024 * 1024;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;

const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

export type ObsidianArchive = {
  files: Map<string, Buffer>;
  markdown: string;
  markdownPath: string;
};

export type ObsidianInputFile = {
  data: Buffer;
  path: string;
};

function archiveError(message: string) {
  return new Error(message);
}

function normalizeArchivePath(value: string) {
  if (!value || value.includes('\\') || value.includes('\0') || value.startsWith('/')) {
    throw archiveError('压缩包包含不安全的文件路径。');
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw archiveError('压缩包包含越界文件路径。');
  }
  return normalized.replace(/^\.\//, '');
}

function isSymbolicLink(entry: Entry) {
  const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (unixMode & 0o170000) === 0o120000;
}

function readEntry(zip: ZipFile, entry: Entry) {
  return new Promise<Buffer>((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error || archiveError(`无法读取 ${entry.fileName}。`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_ARCHIVE_FILE_SIZE) stream.destroy(archiveError(`文件 ${entry.fileName} 超过 10 MB。`));
        else chunks.push(Buffer.from(chunk));
      });
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

export function readObsidianArchive(buffer: Buffer): Promise<ObsidianArchive> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { decodeStrings: true, lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) {
        reject(archiveError('无法读取 ZIP，请确认压缩包没有损坏。'));
        return;
      }

      const files = new Map<string, Buffer>();
      const seenPaths = new Set<string>();
      let entryCount = 0;
      let totalSize = 0;
      let finished = false;
      const fail = (error: unknown) => {
        if (finished) return;
        finished = true;
        zip.close();
        reject(error instanceof Error ? error : archiveError('ZIP 解析失败。'));
      };

      zip.once('error', fail);
      zip.on('entry', (entry) => {
        void (async () => {
          entryCount += 1;
          if (entryCount > MAX_ARCHIVE_ENTRIES) throw archiveError('压缩包文件过多，最多允许 128 个条目。');
          if ((entry.generalPurposeBitFlag & 0x1) !== 0) throw archiveError('不支持加密 ZIP。');
          if (isSymbolicLink(entry)) throw archiveError('压缩包不能包含符号链接。');

          const filePath = normalizeArchivePath(entry.fileName);
          if (filePath.endsWith('/')) {
            zip.readEntry();
            return;
          }
          if (seenPaths.has(filePath)) throw archiveError(`压缩包包含重复路径：${filePath}`);
          seenPaths.add(filePath);

          const basename = path.posix.basename(filePath);
          if (filePath.startsWith('__MACOSX/') || basename === '.DS_Store' || basename.startsWith('._')) {
            zip.readEntry();
            return;
          }

          totalSize += entry.uncompressedSize;
          if (totalSize > MAX_UNCOMPRESSED_SIZE) throw archiveError('压缩包解压后不能超过 100 MB。');
          const extension = path.posix.extname(filePath).toLowerCase();
          const isMarkdown = extension === '.md';
          const isImage = imageExtensions.has(extension);
          if (!isMarkdown && !isImage) {
            zip.readEntry();
            return;
          }
          const entryLimit = isMarkdown ? MAX_MARKDOWN_SIZE : MAX_ARCHIVE_FILE_SIZE;
          if (entry.uncompressedSize > entryLimit) {
            throw archiveError(isMarkdown ? 'Markdown 文件不能超过 2 MB。' : `图片 ${filePath} 不能超过 10 MB。`);
          }
          files.set(filePath, await readEntry(zip, entry));
          zip.readEntry();
        })().catch(fail);
      });
      zip.once('end', () => {
        if (finished) return;
        finished = true;
        const markdownFiles = [...files.keys()].filter((filePath) => filePath.toLowerCase().endsWith('.md'));
        if (markdownFiles.length !== 1) {
          reject(archiveError(markdownFiles.length === 0 ? 'ZIP 中没有找到 Markdown 文件。' : 'ZIP 中只能包含一篇 Markdown。'));
          return;
        }
        const markdownPath = markdownFiles[0]!;
        const markdown = files.get(markdownPath)!.toString('utf8').replace(/^\uFEFF/, '');
        files.delete(markdownPath);
        resolve({ files, markdown, markdownPath });
      });
      zip.readEntry();
    });
  });
}

export function readObsidianFiles(markdownFile: ObsidianInputFile, assetFiles: ObsidianInputFile[]): ObsidianArchive {
  if (assetFiles.length + 1 > MAX_ARCHIVE_ENTRIES) throw archiveError('文件过多，Markdown 和图片合计最多 128 个。');
  const markdownPath = normalizeArchivePath(markdownFile.path);
  if (path.posix.extname(markdownPath).toLowerCase() !== '.md') throw archiveError('请选择 Markdown 文件。');
  if (markdownFile.data.length === 0) throw archiveError('Markdown 文件为空。');
  if (markdownFile.data.length > MAX_MARKDOWN_SIZE) throw archiveError('Markdown 文件不能超过 2 MB。');

  const files = new Map<string, Buffer>();
  let totalSize = markdownFile.data.length;
  for (const asset of assetFiles) {
    const assetPath = normalizeArchivePath(asset.path);
    if (files.has(assetPath)) throw archiveError(`包含重复图片路径：${assetPath}`);
    if (!imageExtensions.has(path.posix.extname(assetPath).toLowerCase())) continue;
    if (asset.data.length > MAX_ARCHIVE_FILE_SIZE) throw archiveError(`图片 ${assetPath} 不能超过 10 MB。`);
    totalSize += asset.data.length;
    if (totalSize > MAX_UNCOMPRESSED_SIZE) throw archiveError('Markdown 和图片合计不能超过 100 MB。');
    files.set(assetPath, asset.data);
  }

  return {
    files,
    markdown: markdownFile.data.toString('utf8').replace(/^\uFEFF/, ''),
    markdownPath,
  };
}

function unquoteYamlValue(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function extractObsidianDocument(markdown: string, markdownPath: string) {
  let bodyMarkdown = markdown.replace(/\r\n?/g, '\n');
  let frontmatterTitle = '';
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(bodyMarkdown);
  if (frontmatter) {
    frontmatterTitle = unquoteYamlValue(/^title:\s*(.+)$/mi.exec(frontmatter[1])?.[1] ?? '');
    bodyMarkdown = bodyMarkdown.slice(frontmatter[0].length);
  }

  const firstHeading = /^(?:\s*\n)*#\s+(.+?)\s*(?:\n+|$)/.exec(bodyMarkdown);
  const headingTitle = firstHeading?.[1]?.replace(/\s+#+\s*$/, '').trim() ?? '';
  if (firstHeading) bodyMarkdown = bodyMarkdown.slice(firstHeading[0].length);
  bodyMarkdown = bodyMarkdown.trim();
  if (!bodyMarkdown) throw archiveError('Markdown 正文为空。');

  const filenameTitle = path.posix.basename(markdownPath, path.posix.extname(markdownPath));
  const title = (frontmatterTitle || headingTitle || filenameTitle).trim();
  if (!title) throw archiveError('无法确定文章标题。');
  if (title.length > 180) throw archiveError('文章标题不能超过 180 字。');
  return { bodyMarkdown, title };
}

export function resolveObsidianAssetPath(markdownPath: string, source: string) {
  const rawPath = source.trim().split(/[?#]/, 1)[0] ?? '';
  if (!rawPath || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(rawPath)) {
    throw archiveError(`图片必须使用同级 assets/ 或 asserts/ 相对路径：${source}`);
  }

  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw archiveError(`图片路径编码无效：${source}`);
  }
  if (decodedPath.includes('\\')) throw archiveError(`图片路径不能使用反斜杠：${source}`);

  const markdownDirectory = path.posix.dirname(normalizeArchivePath(markdownPath));
  const attachmentDirectory = decodedPath.split('/')[0];
  if (attachmentDirectory !== 'assets' && attachmentDirectory !== 'asserts') {
    throw archiveError(`图片必须位于 Markdown 同级的 assets/ 或 asserts/：${source}`);
  }
  const assetRoot = path.posix.join(markdownDirectory, attachmentDirectory);
  const resolved = normalizeArchivePath(path.posix.join(markdownDirectory, decodedPath));
  if (!resolved.startsWith(`${assetRoot}/`)) {
    throw archiveError(`图片必须位于 Markdown 同级的 assets/ 或 asserts/：${source}`);
  }
  return resolved;
}
