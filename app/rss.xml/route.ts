import { getAllPosts } from '@/lib/posts'
import { site, siteUrl } from '@/lib/site'

/**
 * RSS 在构建时生成成 out/rss.xml —— 纯静态，没有运行时开销。
 */
export const dynamic = 'force-static'

function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      default:
        return '&quot;'
    }
  })
}

export function GET() {
  const posts = getAllPosts()

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${post.slug}/</link>
      <guid isPermaLink="true">${siteUrl}/posts/${post.slug}/</guid>
      <pubDate>${new Date(`${post.date}T00:00:00+08:00`).toUTCString()}</pubDate>
      <description>${escapeXml(post.summary || post.title)}</description>
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${site.name}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
