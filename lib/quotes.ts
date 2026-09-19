import fs from 'node:fs'
import path from 'node:path'
import { getAllPosts } from './posts'
import { getAllKnowledge } from './knowledge'
import { getAllNow } from './now'

const QUOTES_FILE = path.join(process.cwd(), 'content', 'quotes.md')

export interface Quote {
  text: string
  author?: string
}

/**
 * FNV-1a 32 位。
 *
 * 用哈希而不是随机数，是因为站点是纯静态导出：随机数会让每次构建的结果
 * 都不一样（而且客户端随机必然和构建产物对不上）。哈希保证「同一篇文章
 * 永远是同一句」，构建可复现。
 */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 解析一行：`正文 —— 作者` 里的后半段可省略 */
function parseLine(line: string): Quote {
  const idx = line.indexOf('——')
  if (idx === -1) return { text: line }
  const text = line.slice(0, idx).trim()
  const author = line.slice(idx + 2).trim()
  return author ? { text, author } : { text }
}

/**
 * 读取语录库全部条目。
 * content/quotes.md 一行一条，# 开头的是注释，空行跳过。
 */
export function getAllQuotes(): Quote[] {
  if (!fs.existsSync(QUOTES_FILE)) return []

  return fs
    .readFileSync(QUOTES_FILE, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map(parseLine)
    .filter((q) => q.text.length > 0)
}

/**
 * 给一篇文章挑一句。
 *
 * 优先按「文章在所有文章里的序号」顺序发牌：只要文章数不超过语录数，
 * 每篇拿到的都不一样——纯哈希取模看着更随机，但 6 篇投 16 条时撞车概率
 * 超过一半，翻两篇文章就撞句子了。
 *
 * 取不到序号（比如以后接到知识库条目上）就退回哈希，保证结果仍然稳定。
 * 库为空时返回 null，调用方据此不渲染——不加这句兜底的话，
 * 一旦文件被删掉整站构建会直接挂。
 */
export function getQuoteForSlug(slug: string): Quote | null {
  const quotes = getAllQuotes()
  if (quotes.length === 0) return null

  // 文章、知识条目、now 三条线共用一张发牌表：只按 posts 排的话，
  // 知识条目会掉回哈希，两篇相邻条目撞同一句的概率很高。
  const slugs = [
    ...getAllPosts().map((p) => p.slug),
    ...getAllKnowledge().map((k) => k.slug),
    ...getAllNow().map((n) => n.id),
  ]

  const order = slugs.indexOf(slug)
  const index = order >= 0 ? order : hash(slug)
  return quotes[index % quotes.length]
}
