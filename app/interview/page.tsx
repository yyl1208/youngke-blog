import Link from 'next/link'
import { getInterviewGroupedByDomain } from '@/lib/interview'

export const metadata = {
  title: '面试题 · 杨苛',
  description: '按主题整理面试问题、回答思路和追问',
}

export default function InterviewPage() {
  const groups = getInterviewGroupedByDomain()

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">面试题</h1>
        <p className="page-desc">
          按主题整理问题、回答思路和追问，复习时慢慢补全。
        </p>
        <div className="page-meta">
          <span>共 {groups.reduce((n, g) => n + g.items.length, 0)} 条</span>
          <span>{groups.length} 个领域</span>
        </div>
      </header>

      {groups.length === 0 && <p className="empty-note">还没有整理好的面试题。</p>}

      {groups.map((group) => (
        <section className="domain-group" key={group.domain}>
          <div className="domain-head">
            <span className="domain-name">{group.domain}</span>
            <span className="domain-count tnum">{group.items.length}</span>
          </div>

          <ul className="item-list">
            {group.items.map((k) => (
              <li key={k.slug}>
                <Link href={`/interview/${k.slug}/`} className="card-link">
                  <div>
                    <span className="card-title">{k.title}</span>
                    {k.summary && <p className="card-desc">{k.summary}</p>}
                    {k.tags.length > 0 && (
                      <div className="card-tags">
                        {k.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="card-side tnum">{k.date.slice(5).replace('-', '/')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
