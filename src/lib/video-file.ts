export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export function videoFileError(file: { name: string; size: number; type: string }): string | undefined {
  if (!/\.mp4$/i.test(file.name) || (file.type && file.type !== 'video/mp4')) return '请选择 MP4 视频文件。';
  if (file.size <= 0) return '视频文件为空。';
  if (file.size > MAX_VIDEO_SIZE) return '视频不能超过 50 MB。';
}

/** Check the ISO BMFF file-type box; a renamed HTML/image file is not an MP4. */
export function isMP4(data: Uint8Array): boolean {
  if (data.length < 16) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...data.subarray(offset, offset + 4));
  const brands = new Set(['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'iso7', 'iso8', 'iso9', 'mp41', 'mp42', 'avc1', 'M4V ', 'MSNV', 'dash']);
  for (let offset = 0; offset + 16 <= Math.min(data.length, 4096);) {
    const size = view.getUint32(offset);
    if (size < 8 || offset + size > data.length) return false;
    if (ascii(offset + 4) === 'ftyp') {
      if (size < 16 || size % 4 !== 0) return false;
      if (brands.has(ascii(offset + 8))) return true;
      for (let brand = offset + 16; brand + 4 <= offset + size; brand += 4) {
        if (brands.has(ascii(brand))) return true;
      }
      return false;
    }
    offset += size;
  }
  return false;
}
