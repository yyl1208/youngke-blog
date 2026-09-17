import Link from 'next/link'
import { getAllTags, getPostsGroupedByYear } from '@/lib/posts'
import { site } from '@/lib/site'

export const metadata = {
  title: `归档 · ${site.name}`,
}

export default function Archive() {
  const groups = getPostsGroupedByYear()
  const tags = getAllTags()

  return (
    <>
      <h1 className="hero-name">归档</h1>
      <p className="hero-role">按时间倒序，共 {groups.reduce((n, g) => n + g.posts.length, 0)} 篇</p>

      {tags.length > 0 && (
        <>
          <div className="section-rule" />
          <p className="section-label">标签</p>
          <div className="tag-cloud">
            {tags.map(({ tag, count }) => (
              <span key={tag} className="tag-chip">
                #{tag} {count}
              </span>
            ))}
          </div>
        </>
      )}

      {groups.map((group) => (
        <section key={group.year} className="year-group">
          <p className="year-label tnum">{group.year}</p>
          <ul className="post-list">
            {group.posts.map((post) => (
              <li key={post.slug} className="post-item">
                <Link href={`/posts/${post.slug}/`} className="post-link">
                  <span className="post-title">{post.title}</span>
                  <span className="post-meta tnum">
                    {post.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div style={{ marginTop: 'var(--sp-12)' }}>
        <Link href="/" className="back-link">
          ← 返回
        </Link>
      </div>
    </>
  )
}
