/**
 * 「现在在做」的三条主线 —— 改这里就能更新首页 Now 区块。
 *
 * 这是**记录**，不是进度条：往下追加 `{ date, text }` 就是记一条，
 * 不统计百分比、不显示完成度。想区分「已经发生」和「打算做」，
 * 给那条加 `done: false`，页面上会画成空心点。
 *
 * 口径沿用 journey.ts：不写真名，公司用行业代称。
 */

export interface NowEntry {
  /** 记录时间，写 '2026.09' 或 '2026-09-12' 都行，原样展示 */
  date: string
  text: string
  /** 默认已发生（实心点）；false 表示还没落地（空心点） */
  done?: boolean
}

export interface NowTrack {
  id: string
  title: string
  /** 形如 '2026.09 — 进行中' */
  period: string
  desc: string
  entries: NowEntry[]
}

export const nowTracks: NowTrack[] = [
  {
    id: 'deepseek-harness',
    title: '研究 DeepSeek Harness',
    period: '2026.09 — 进行中',
    desc: '把 DeepSeek 的 agent harness 拆开看：上下文怎么组装、工具怎么调度、长任务怎么收敛。',
    entries: [
      { date: '2026.09', text: '通读官方 agent 示例与工具调用协议' },
      { date: '2026.09', text: '跑通一个最小可运行的 harness' },
      { date: '2026.10', text: '拆出可复用的上下文组装与工具调度层', done: false },
      { date: '2026.10', text: '接到自己的 agent 编排上跑长任务', done: false },
    ],
  },
  {
    id: 'micro-frontend-workflow',
    title: '微前端 + 生产工作流架构设计抽离',
    period: '2026.08 — 进行中',
    desc: '把做工作流平台时的微前端脚手架和流程设计器重新抽一遍，去掉业务绑定，留一套能复用的骨架。',
    entries: [
      { date: '2026.08', text: '翻旧代码，圈出可抽离的模块' },
      { date: '2026.09', text: '沙箱与通信层抽出来，脱离业务跑通' },
      { date: '2026.09', text: '流程设计器组件化，去掉业务耦合', done: false },
      { date: '2026.10', text: '补架构说明，开源出去', done: false },
    ],
  },
  {
    id: 'job-hunting',
    title: '找工作',
    period: '2026.02 — 进行中',
    desc: '2 月离职，脱产找全栈 / AI Agent 方向的岗位，目标 9—10 月落定。',
    entries: [
      { date: '2026.02', text: '离职，进入脱产求职' },
      { date: '2026.08', text: '简历与项目材料梳理完' },
      { date: '2026.09', text: '集中投递与面试', done: false },
      { date: '2026.10', text: '拿到 offer', done: false },
    ],
  },
]
