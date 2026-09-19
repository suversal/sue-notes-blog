const blogDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function formatBlogDateTime(value: string) {
  return blogDateTimeFormatter.format(new Date(value));
}

export function readingMinutes(markdown: string) {
  return Math.max(1, Math.ceil(markdown.replace(/[#>*`\-_\[\]()]/g, '').length / 500));
}
