import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllNow, getNowById } from '@/lib/now'
import ClosingQuote from '@/components/ClosingQuote'

/**
 * 一件正在做的事：/now/<id>
 * 正文就是 content/now/<id>.md 里写的 Markdown，想记什么写什么。
 *
 * 静态导出，所以每件都得在这里预先声明路由 —— 加了新文件会自动进来。
 */
export function generateStaticParams() {
  return getAllNow().map((item) => ({ id: item.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getNowById(id)
  if (!item) return {}
  return {
    title: `${item.title} · 杨苛`,
    description: item.note,
  }
}

export default async function NowItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getNowById(id)

  if (!item) notFound()

  const others = getAllNow().filter((o) => o.id !== item.id)

  return (
    <>
      <nav className="now-crumb">
        <Link href="/" className="now-crumb-link">
          NOW
        </Link>
        <span className="now-crumb-sep" aria-hidden="true">
          /
        </span>
        <span>{item.title}</span>
      </nav>

      <header className="page-head">
        <h1 className="page-title">{item.title}</h1>
        {item.note && <p className="page-desc">{item.note}</p>}
      </header>

      <div className="prose" dangerouslySetInnerHTML={{ __html: item.html }} />

      <ClosingQuote slug={item.id} />

      {others.length > 0 && (
        <section className="now-others">
          <h2 className="now-others-title">现在在做的其他事</h2>

          <ul className="now-list">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/now/${o.id}/`} className="np-row">
                  <span className="np-main">
                    <span className="np-title">{o.title}</span>
                    {o.note && <span className="np-note">{o.note}</span>}
                  </span>
                  <span className="np-meta">
                    <span className="np-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <Link href="/" className="back-link">
          ← 返回首页
        </Link>
      </div>
    </>
  )
}
