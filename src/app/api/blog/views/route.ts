import { sql } from '@payloadcms/db-postgres'
import { getPayloadClient } from '../../../../lib/payload'

const PAGE_KEY_PATTERN = /^\/blog\/([^/?#]+)$/
const MAX_PAGE_KEYS = 100

function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function recentCutoff(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - (days - 1))
  return dayKey(date)
}

function parsePageKeys(value: string | null) {
  if (!value) return []
  return [...new Set(value.split(',').map((key) => key.trim()).filter((key) => PAGE_KEY_PATTERN.test(key)))]
    .slice(0, MAX_PAGE_KEYS)
}

export async function GET(request: Request) {
  const keys = parsePageKeys(new URL(request.url).searchParams.get('page_keys'))
  if (!keys.length) return Response.json({ data: {} })

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'article-view-days',
    overrideAccess: true,
    pagination: false,
    limit: 3_100,
    where: {
      and: [
        { pageKey: { in: keys } },
        { dayKey: { greater_than_equal: recentCutoff(30) } },
      ],
    },
  })

  const data = Object.fromEntries(keys.map((key) => [key, 0]))
  for (const row of result.docs as unknown as Array<{ pageKey: string; views: number }>) {
    if (row.pageKey in data) data[row.pageKey] += Number(row.views) || 0
  }
  return Response.json({ data })
}

export async function POST(request: Request) {
  let pageKey = ''
  try {
    const body = (await request.json()) as { pageKey?: unknown }
    pageKey = typeof body.pageKey === 'string' ? body.pageKey.trim() : ''
  } catch {
    return Response.json({ message: '阅读地址无效。' }, { status: 400 })
  }

  const match = pageKey.match(PAGE_KEY_PATTERN)
  if (!match) return Response.json({ message: '阅读地址无效。' }, { status: 400 })

  let publishedSlug = ''
  try {
    publishedSlug = decodeURIComponent(match[1])
  } catch {
    return Response.json({ message: '阅读地址无效。' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  const published = await payload.find({
    collection: 'articles',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { publishedSlug: { equals: publishedSlug } },
        { status: { equals: 'published' } },
        { visibility: { equals: 'public' } },
      ],
    },
  })
  if (!published.docs.length) return Response.json({ message: '文章不存在。' }, { status: 404 })

  const today = dayKey()
  await payload.db.drizzle.execute(sql`
    INSERT INTO "article_view_days" ("page_key", "day_key", "views")
    VALUES (${`/blog/${publishedSlug}`}, ${today}, 1)
    ON CONFLICT ("page_key", "day_key")
    DO UPDATE SET "views" = "article_view_days"."views" + 1;
  `)

  return Response.json({ recorded: true })
}
