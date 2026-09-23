import PostTagFilter from '@/components/PostTagFilter'
import { getAllPosts } from '@/lib/posts'

export const metadata = {
  title: '文章 · 杨苛',
  description: '写给自己看的笔记',
}

export default function PostsPage() {
  const posts = getAllPosts().map(({ slug, title, date, tags }) => ({
    slug, title, date, tags: [...new Set(tags)],
  }))
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  const tags = [...counts].map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  const total = posts.length

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

      <PostTagFilter posts={posts} tags={tags} />
    </>
  )
}
