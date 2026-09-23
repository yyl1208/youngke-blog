'use client'

import { useState } from 'react'
import Link from 'next/link'

type Post = {
  slug: string
  title: string
  date: string
  tags: string[]
}

export default function PostTagFilter({ posts, tags }: {
  posts: Post[]
  tags: { tag: string; count: number }[]
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const filtered = selectedTag === null
    ? posts
    : posts.filter((post) => post.tags.includes(selectedTag))
  const groups = new Map<string, Post[]>()
  for (const post of filtered) {
    const year = post.date.slice(0, 4)
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(post)
  }

  return (
    <>
      {tags.length > 0 && (
        <section className="post-tag-filter" aria-labelledby="post-tags-heading">
          <div className="section-head">
            <span className="section-num">—</span>
            <span className="section-title" id="post-tags-heading">Tags · 标签筛选</span>
          </div>
          <div className="tag-cloud" role="group" aria-label="按标签筛选文章">
            <button type="button" className="tag-chip" aria-pressed={selectedTag === null}
              aria-controls="filtered-posts" onClick={() => setSelectedTag(null)}>
              全部 <span className="tnum">{posts.length}</span>
            </button>
            {tags.map(({ tag, count }) => (
              <button key={tag} type="button" className="tag-chip"
                aria-pressed={selectedTag === tag} aria-controls="filtered-posts"
                onClick={() => setSelectedTag(tag)}>
                {tag} <span className="tnum">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="post-filter-status" role="status">
        {selectedTag === null ? `全部文章 · ${filtered.length} 篇` : `标签「${selectedTag}」· ${filtered.length} 篇`}
      </p>
      <div id="filtered-posts">
        {filtered.length === 0 && <p className="empty-note">暂无文章。</p>}
        {[...groups].map(([year, items]) => (
          <section className="year-group" key={year}>
            <div className="year-label tnum">{year}</div>
            <ul className="row-list">
              {items.map((post) => (
                <li className="row-item" key={post.slug}>
                  <Link href={`/posts/${post.slug}/`} className="row-link">
                    <span className="row-date tnum">{post.date.slice(5).replace('-', '/')}</span>
                    <span className="row-title">{post.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
