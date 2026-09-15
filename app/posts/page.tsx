import Link from 'next/link'
import { getAllPosts, getAllTags, getPostsGroupedByYear } from '@/lib/posts'

export const metadata = {
  title: '文章 · 杨苛',
  description: '写给自己看的笔记',
}

export default function PostsPage() {
  const groups = getPostsGroupedByYear()
  const tags = getAllTags()
  const total = getAllPosts().length

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">文章</h1>
        <p className="page-desc">
          主要写给自己看。碰到过的问题、想明白的事，趁还记得的时候记下来。
        </p>
        <div className="page-meta">
          <span>共 {total} 篇</span>
          <span>{tags.length} 个标签</span>
        </div>
      </header>

      {groups.map((group) => (
        <section className="year-group" key={group.year}>
          <div className="year-label tnum">{group.year}</div>
          <ul className="row-list">
            {group.posts.map((post) => (
              <li className="row-item" key={post.slug}>
                <Link href={`/posts/${post.slug}/`} className="row-link">
                  <span className="row-date tnum">
                    {post.date.slice(5).replace('-', '/')}
                  </span>
                  <span className="row-title">{post.title}</span>
                  <span className="row-side tnum">{post.minutes} 分钟</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {tags.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="section-num">—</span>
            <span className="section-title">Tags</span>
            <span className="section-title-zh">标签</span>
          </div>
          <div className="tag-cloud">
            {tags.map(({ tag, count }) => (
              <span key={tag} className="tag-chip">
                {tag} <span className="tnum">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
