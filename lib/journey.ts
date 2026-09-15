/**
 * 经历数据 —— 全部来自真实履历，改这里就能更新「经历」页。
 * 项目挂在对应工作经历下，role 写实际承担的角色，不写形容词。
 */

export interface Project {
  name: string
  period: string
  role: string
  stack: string
  /** 一到两句说清楚做了什么，用自述腔 */
  desc: string
}

export interface Job {
  company: string
  period: string
  title: string
  note: string
  projects: Project[]
}

export const journey: Job[] = [
  {
    company: '互联网车企',
    period: '2024.04 — 2026.02',
    title: '全栈开发',
    note: '地图编辑器项目',
    projects: [
      {
        name: '地图编辑器',
        period: '2024.04 — 2026.02',
        role: '前端+后端',
        stack: 'Vue3 · TS · Vite · Leaflet · Turf · Java 微服务 · PostgreSQL · ClickHouse · MongoDB · Kafka',
        desc:
          '编辑器、任务管理、业务图层的前端维护；后端写了质检模块和每周的路网运维调度算法，还做了运维看板和 pb 转 shapefile。团队研发 20+。',
      }
    ],
  },
  {
    company: '某半导体科技公司',
    period: '2023.05 — 2024.01',
    title: '前端架构师',
    note: '半导体行业 MES、工作流产品',
    projects: [
      {
        name: 'Workflow 工作流平台',
        period: '2023.05 — 2024.01',
        role: '前端架构',
        stack: 'Vue3 · Vite · 无界微前端 · Arco Design · bpmn-js · Fastify',
        desc:
          '搭了微前端脚手架并定规范，开发 bpmn 流程设计器并抽出组件供外部调用；登陆中心、用户门户、dashboard 是样版模块，各模块 Node BFF 层也归我维护。团队研发 8。',
      },
    ],
  },
  {
    company: '某网络安全科技',
    period: '2021.03 — 2023.03',
    title: '前端部分大模块负责人',
    note: '创业公司，做自研安全产品',
    projects: [
      {
        name: '安全云服务平台',
        period: '2022.02 — 2023.03',
        role: 'ASM 模块负责人',
        stack: 'Vue2 · Webpack · ECharts · D3 · antv-x6 · Micro-app',
        desc:
          '负责 ASM 攻击面管理 1.0 到 2.0（资产、风险、任务、服务）；模块太多后用 Micro-app 做了拆分；协助 antv-x6 实现拖拽式流程引擎，另外还写了大屏的自定义容器和 loading / 空页面指令。研发 40+，前端 7。',
      },
      {
        name: '物联网安全平台',
        period: '2021.03 — 2022.02',
        role: '前端负责人 + 硬件前端',
        stack: 'Vue2 · Webpack · ECharts',
        desc:
          '资产、告警、准入控制三个模块，外加 Mock / 演示环境和相关大屏。研发 10+，前端 2。',
      },
    ],
  },
  {
    company: '外企咨询公司',
    period: '2018.11 — 2021.01',
    title: '前端开发',
    note: '外企，服务国内外车企、药企',
    projects: [
      {
        name: '某制造厂商质量看板',
        period: '2020.06 — 2021.01',
        role: '独立负责前端全部模块',
        stack: 'Vue2 · TS · ECharts',
        desc:
          '质量报表、会议面板、KPI、PDF 轮播，ECharts 联动做得比较多，屏幕适配用 rem。',
      },
      {
        name: '某汽车零部件物联项目',
        period: '2019.01 — 2020.06',
        role: '前端开发',
        stack: 'Vue2 · TS · ECharts · HereMap · vue-grid-layout',
        desc:
          '新加坡尾气监控（地图车辆实时显示、历史路程分析、报警）、伦敦丹麦物联网平台迁移、CES 展会大屏、零件运维平台，还有基于 vue-grid-layout 的可拖拽分析面板。',
      },
    ],
  },
]
