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

/**
 * 「现在在做的事」—— 内容全在 content/now/ 目录里，一个文件一件事。
 *
 * ── 加一件事 ────────────────────────────────────────
 *   在 content/now/ 下新建一个 .md 文件，文件名就是网址（/now/<文件名>），
 *   所以文件名只用小写字母、数字、连字符，比如 deepseek-harness.md。
 *   也可以放子目录归类（job/hunting.md → /now/job/hunting/）。
 *
 * ── 文件长这样 ──────────────────────────────────────
 *   ---
 *   title: 研究 DeepSeek Harness      # 首页显示的那一行
 *   note: 上下文怎么组装、工具怎么调度。 # 首页标题下的小字，可省略
 *   order: 1                          # 首页排序，小的在前，可省略
 *   ---
 *
 *   正文用 Markdown 随便写，点进详情页看到的就是它。
 *
 * ── 删/改 ───────────────────────────────────────────
 *   删掉文件就没了；改文件内容，首页和详情页一起变。
 *
 * 这里不维护任何状态：没有进度、没有完成度、没有已完成/未完成之分。
 */

const NOW_DIR = path.join(process.cwd(), 'content', 'now')

export interface NowMeta {
  /** URL slug，就是 md 文件名 */
  id: string
  title: string
  /** 首页标题下的小字 */
  note: string
  /** 首页排序，小的在前 */
  order: number
}

export interface NowItem extends NowMeta {
  /** 正文渲染后的 HTML */
  html: string
}

function toMeta(id: string, data: Record<string, unknown>): NowMeta {
  return {
    id,
    title: (data.title as string) ?? id,
    note: (data.note as string) ?? '',
    order: typeof data.order === 'number' ? data.order : 999,
  }
}

/** 读取全部（只解析 frontmatter，不渲染正文）—— 首页用这个。递归收集，子目录体现在 id 里 */
export function getAllNow(): NowMeta[] {
  if (!fs.existsSync(NOW_DIR)) return []

  const items = collectMdFiles(NOW_DIR).map(({ slug: id, filepath }) => {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data } = matter(raw)
    return toMeta(id, data)
  })

  return items.sort((a, b) =>
    a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)
  )
}

/** 读取单件（含渲染后的正文）—— 详情页用这个。id 可含斜杠 */
export async function getNowById(id: string): Promise<NowItem | null> {
  if (id.includes('..')) return null
  const filepath = path.join(NOW_DIR, `${id}.md`)
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

  return { ...toMeta(id, data), html: String(file) }
}
