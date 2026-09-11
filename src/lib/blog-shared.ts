export function readingMinutes(markdown: string) {
  return Math.max(1, Math.ceil(markdown.replace(/[#>*`\-_\[\]()]/g, '').length / 500));
}
