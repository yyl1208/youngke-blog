import fs from 'node:fs'
import path from 'node:path'

/**
 * 递归收集一个根目录下所有 .md 文件的「相对 slug」。
 *
 * content/posts/foo.md            → 'foo'
 * content/posts/frontend/bar.md   → 'frontend/bar'
 *
 * slug 里的斜杠就是 URL 里的层级（配合路由的 catch-all 段），
 * 旧的文章平铺在根目录，slug 和以前完全一样——向后兼容，不改任何旧链接。
 */

export interface MdFile {
  /** 相对根目录的路径（不含 .md，斜杠分隔），同时是 URL slug */
  slug: string
  /** 绝对路径，读取用 */
  filepath: string
}

export function collectMdFiles(root: string): MdFile[] {
  const out: MdFile[] = []

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rel = path.relative(root, full).replace(/\.md$/, '').split(path.sep).join('/')
        out.push({ slug: rel, filepath: full })
      }
    }
  }

  walk(root)
  return out
}
