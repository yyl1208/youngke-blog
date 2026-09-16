import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import WechatPromo from '@/components/WechatPromo'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} · 杨苛`,
    description: post.summary,
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) notFound()

  return (
    <article>
      <header className="article-head">
        <h1 className="article-title">{post.title}</h1>
        <div className="article-meta tnum">
          {post.date} · {post.minutes} 分钟
          {post.tags.length > 0 && <span> · {post.tags.map((t) => `#${t}`).join(' ')}</span>}
        </div>
      </header>

      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

      <WechatPromo />

      <div style={{ marginTop: 'var(--sp-12)' }}>
        <Link href="/" className="back-link">
          ← 返回
        </Link>
      </div>
    </article>
  )
}
