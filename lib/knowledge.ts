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

const KNOWLEDGE_DIR = path.join(process.cwd(), 'content', 'knowledge')

export interface KnowledgeMeta {
  slug: string
  title: string
  domain: string
  project: string
  date: string
  tags: string[]
}

export interface Knowledge extends KnowledgeMeta {
  html: string
}

/** gray-matter 会把 2026-09-15 解析成 Date，收敛成字符串 */
function normalizeDate(value: unknown): string {
  if (!value) return '1970-01-01'
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function normalizeTags(value: unknown): string[] {
  if (!value) return []
  return Array.isArray(value) ? value.map(String) : [String(value)]
}

/** 读取所有知识条目元数据（同步，不渲染正文）。递归收集，子目录体现在 slug 里 */
export function getAllKnowledge(): KnowledgeMeta[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return []

  const items = collectMdFiles(KNOWLEDGE_DIR).map(({ slug, filepath }) => {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data } = matter(raw)

    return {
      slug,
      title: (data.title as string) ?? slug,
      domain: (data.domain as string) ?? '其他',
      project: (data.project as string) ?? '',
      date: normalizeDate(data.date),
      tags: normalizeTags(data.tags),
    }
  })

  return items.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** 按领域分组，领域按条目数降序 */
export function getKnowledgeGroupedByDomain(): { domain: string; items: KnowledgeMeta[] }[] {
  const groups = new Map<string, KnowledgeMeta[]>()
  for (const item of getAllKnowledge()) {
    if (!groups.has(item.domain)) groups.set(item.domain, [])
    groups.get(item.domain)!.push(item)
  }
  return [...groups.entries()]
    .map(([domain, items]) => ({ domain, items }))
    .sort((a, b) => b.items.length - a.items.length || a.domain.localeCompare(b.domain))
}

/** 获取单条知识（含渲染后的 HTML）。slug 可含斜杠 */
export async function getKnowledgeBySlug(slug: string): Promise<Knowledge | null> {
  if (slug.includes('..')) return null
  const filepath = path.join(KNOWLEDGE_DIR, `${slug}.md`)
  if (!fs.existsSync(filepath)) return null

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)

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
    domain: (data.domain as string) ?? '其他',
    project: (data.project as string) ?? '',
    date: normalizeDate(data.date),
    tags: normalizeTags(data.tags),
    html: String(file),
  }
}
