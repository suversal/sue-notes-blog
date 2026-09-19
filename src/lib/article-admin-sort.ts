export type ArticleAdminOrder = 'newest' | 'oldest' | 'published-newest' | 'published-oldest'

type ArticleDates = { publishedAt?: string; updatedAt: string }

const articleAdminDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function formatArticleAdminDateTime(value: string) {
  return articleAdminDateTimeFormatter.format(new Date(value))
}

export function compareArticleAdminOrder(a: ArticleDates, b: ArticleDates, order: ArticleAdminOrder) {
  if (order === 'newest') return b.updatedAt.localeCompare(a.updatedAt)
  if (order === 'oldest') return a.updatedAt.localeCompare(b.updatedAt)

  const aPublished = a.publishedAt ?? ''
  const bPublished = b.publishedAt ?? ''
  if (aPublished && !bPublished) return -1
  if (!aPublished && bPublished) return 1
  if (!aPublished && !bPublished) return b.updatedAt.localeCompare(a.updatedAt)
  return order === 'published-newest'
    ? bPublished.localeCompare(aPublished)
    : aPublished.localeCompare(bPublished)
}
