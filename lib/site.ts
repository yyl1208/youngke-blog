/**
 * 站点级常量。
 * 要改域名 / 仓库名 / 联系方式，只改这一处。
 */

export const site = {
  name: '杨苛',
  title: '杨苛 · 用 AI 不断拓展自己的能力边界',
  description:
    '全栈工程师，坐标扬州。前端 7 年，后端 2 年，一直在跟地图和可视化打交道。写做过的东西和踩过的坑。',
  /** GitHub Pages 的仓库名。仓库改名时必须同步改这里，否则 basePath 会对不上 */
  repo: 'youngke-blog',
  owner: 'yyl1208',
  github: 'https://github.com/yyl1208',
  email: '1115383145@qq.com',
}

/**
 * 生产构建挂在 https://yyl1208.github.io/youngke-blog/ 这样的子路径下，
 * 所以产物里的资源链接必须带前缀；本地 dev 不能带，否则 404。
 */
export const basePath = process.env.NODE_ENV === 'production' ? `/${site.repo}` : ''

export const siteUrl = `https://${site.owner}.github.io/${site.repo}`
