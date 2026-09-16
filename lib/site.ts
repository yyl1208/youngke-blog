/**
 * 站点级常量。
 * 要改域名 / 仓库名 / 联系方式，只改这一处。
 */

export const site = {
  name: '杨苛',
  title: '杨苛 · 用 AI 不断拓展自己的能力边界',
  description:
    '全栈工程师，当前坐标扬州。正在努力成为一个独立开发者、开源贡献者和技术博主。',
  /** GitHub 仓库名。若部署到 GitHub Pages，它同时决定子路径前缀 */
  repo: 'youngke-blog',
  owner: 'yyl1208',
  github: 'https://github.com/yyl1208',
  email: '1115383145@qq.com',
}

/**
 * 部署形态决定两件事：资源路径前缀、站点绝对地址。
 *
 * - **自定义域名**（EdgeOne Pages / 对象存储 + CDN 等，站点落在根目录）→ 不需要前缀，这是默认形态
 * - **GitHub Pages**（仓库名不是 `<user>.github.io`，站点落在子路径）→ 必须加 `/<repo>` 前缀，
 *   否则部署后 CSS / JS 全部 404。构建时设 `DEPLOY_TARGET=github-pages` 即可切换
 *
 * 不依赖 NODE_ENV，因为两种形态都是生产构建。
 */
const isGithubPages = process.env.DEPLOY_TARGET === 'github-pages'

export const basePath = isGithubPages ? `/${site.repo}` : ''

/**
 * 站点绝对地址，RSS、metadata 里的链接都要用它。
 * 部署时通过环境变量 `SITE_URL` 注入，例如 `SITE_URL=https://yangke.dev`。
 */
export const siteUrl =
  process.env.SITE_URL ?? (isGithubPages ? `https://${site.owner}.github.io/${site.repo}` : '')
