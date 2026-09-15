import Link from 'next/link'
import { getKnowledgeGroupedByDomain } from '@/lib/knowledge'

export const metadata = {
  title: '知识库 · 杨苛',
  description: '从项目里捞出来的踩坑记录和解法',
}

export default function KnowledgePage() {
  const groups = getKnowledgeGroupedByDomain()

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">知识库</h1>
        <p className="page-desc">
          从真实项目里捞出来的东西。不是教程，是当时具体踩了什么坑、最后怎么解的。
        </p>
        <div className="page-meta">
          <span>共 {groups.reduce((n, g) => n + g.items.length, 0)} 条</span>
          <span>{groups.length} 个领域</span>
        </div>
      </header>

      {groups.map((group) => (
        <section className="domain-group" key={group.domain}>
          <div className="domain-head">
            <span className="domain-name">{group.domain}</span>
            <span className="domain-count tnum">{group.items.length}</span>
          </div>

          <ul className="item-list">
            {group.items.map((k) => (
              <li key={k.slug}>
                <Link href={`/knowledge/${k.slug}/`} className="card-link">
                  <div>
                    <span className="card-title">{k.title}</span>
                    {k.project && <p className="card-desc">{k.project}</p>}
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
