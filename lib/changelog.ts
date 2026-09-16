/**
 * 站点改动记录 —— 每次动过站本身（文案、结构、功能、部署方式）就往这里加一条。
 *
 * 不是版本发布，只是留痕：过几个月回看，能知道自己到底折腾了什么。
 * 页面在 /changelog/ ，入口只挂在页脚，不进主导航。
 *
 * 新条目加在数组**最前面**（页面按数组顺序渲染，不额外排序）。
 */

export type ChangeEntry = {
  /** YYYY-MM-DD */
  date: string
  /** 一句话概括这次改了什么 */
  title: string
  /** 具体条目，每条一行 */
  items: string[]
}

export const changelog: ChangeEntry[] = [
  {
    date: '2026-09-16',
    title: '改了自我描述',
    items: [
      '首页 hero 与「关于」页的自我描述统一为「全栈工程师，当前坐标扬州。正在努力成为一个独立开发者、开源贡献者和技术博主。」',
      '站点 description 同步更新，页面 metadata 与 /rss.xml 都跟着变',
      '新增本页：更新日志，入口在页脚',
    ],
  },
]
