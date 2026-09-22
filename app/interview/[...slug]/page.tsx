import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllInterview, getInterviewBySlug } from '@/lib/interview'

export function generateStaticParams() {
  return getAllInterview().map((k) => ({ slug: k.slug.split('/') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const k = await getInterviewBySlug(slug.join('/'))
  if (!k) return {}
  return {
    title: `${k.title} · 杨苛`,
    description: `${k.domain} ${k.summary}`.trim(),
  }
}

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const k = await getInterviewBySlug(slug.join('/'))

  if (!k) notFound()

  return (
    <article>
      <header className="article-head">
        <h1 className="article-title">{k.title}</h1>
        <div className="article-meta tnum">
          {k.date} · {k.domain}
          {k.tags.length > 0 && <span> · {k.tags.map((t) => `#${t}`).join(' ')}</span>}
        </div>
      </header>

      <div className="prose" dangerouslySetInnerHTML={{ __html: k.html }} />

      <Link href="/interview" className="back-link">
        ← 返回面试题
      </Link>
    </article>
  )
}
