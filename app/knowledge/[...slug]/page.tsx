import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllKnowledge, getKnowledgeBySlug } from '@/lib/knowledge'
import ClosingQuote from '@/components/ClosingQuote'

export function generateStaticParams() {
  return getAllKnowledge().map((k) => ({ slug: k.slug.split('/') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const k = await getKnowledgeBySlug(slug.join('/'))
  if (!k) return {}
  return {
    title: `${k.title} · 杨苛`,
    description: `${k.domain} ${k.project}`.trim(),
  }
}

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const k = await getKnowledgeBySlug(slug.join('/'))

  if (!k) notFound()

  return (
    <article>
      <header className="article-head">
        <h1 className="article-title">{k.title}</h1>
        <div className="article-meta tnum">
          {k.date} · {k.domain}
          {k.project && <span> · {k.project}</span>}
          {k.tags.length > 0 && <span> · {k.tags.map((t) => `#${t}`).join(' ')}</span>}
        </div>
      </header>

      <div className="prose" dangerouslySetInnerHTML={{ __html: k.html }} />

      <ClosingQuote slug={k.slug} />

      <Link href="/knowledge" className="back-link">
        ← 返回知识库
      </Link>
    </article>
  )
}
