import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import { collectMdFiles } from './md-walk'

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')

export interface PostMeta {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  words: number
}

export interface Post extends PostMeta {
  html: string
}

/**
 * YAML 会把 2026-09-15 解析成 Date 对象，直接渲染会报
 * "Objects are not valid as a React child"。统一收敛成 YYYY-MM-DD 字符串，
 * 这样写文章时日期可以不加引号。
 */
function normalizeDate(value: unknown): string {
  if (!value) return '1970-01-01'
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

/** 只写一个标签时 YAML 给的是字符串，统一收敛成数组 */
function normalizeTags(value: unknown): string[] {
  if (!value) return []
  return Array.isArray(value) ? value.map(String) : [String(value)]
}

/** 中英文混排的字数统计：中文按字、英文按词 */
function countWords(md: string): number {
  const cn = (md.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const en = (md.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) ?? []).length
  return cn + en
}

/**
 * 读取所有文章元数据（同步，不渲染正文）。
 * content/posts/ 下递归收集每个 .md 就是一篇；子目录体现在 slug 里
 * （frontend/perf.md → /posts/frontend/perf/），平铺的旧文件 URL 不变。
 */
export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return []

  const posts = collectMdFiles(POSTS_DIR).map(({ slug, filepath }) => {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data, content } = matter(raw)
    const words = countWords(content)

    return {
      slug,
      title: (data.title as string) ?? slug,
      date: normalizeDate(data.date),
      tags: normalizeTags(data.tags),
      summary: (data.summary as string) ?? '',
      words,
    }
  })

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** 获取单篇文章（含渲染后的 HTML）。slug 可含斜杠，如 'frontend/perf' */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (slug.includes('..')) return null
  const filepath = path.join(POSTS_DIR, `${slug}.md`)
  if (!fs.existsSync(filepath)) return null

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)
  const words = countWords(content)

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark-default' },
      defaultColor: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content)

  return {
    slug,
    title: (data.title as string) ?? slug,
    date: normalizeDate(data.date),
    tags: normalizeTags(data.tags),
    summary: (data.summary as string) ?? '',
    words,
    html: String(file),
  }
}

/** 所有标签及文章数（按数量降序） */
export function getAllTags(): { tag: string; count: number }[] {
  const counter = new Map<string, number>()
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** 按标签筛选文章 */
export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((p) => p.tags.includes(tag))
}

/** 按年份分组，用于归档页 */
export function getPostsGroupedByYear(): { year: string; posts: PostMeta[] }[] {
  const groups = new Map<string, PostMeta[]>()
  for (const post of getAllPosts()) {
    const year = post.date.slice(0, 4)
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(post)
  }
  return [...groups.entries()]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => (a.year < b.year ? 1 : -1))
}
