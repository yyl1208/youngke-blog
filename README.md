<div align="center">

# youngke

**用 AI 不断拓展自己的能力边界**

杨苛的个人博客 · 纯静态 · 黑白双主题

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-000000?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-000000?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-000000?style=flat-square)](./LICENSE)

[在线预览](https://yyl1208.github.io/youngke-blog/) · [English](./README.en.md)

</div>

---

## 这是什么

没有数据库、没有后端、没有账号系统 —— `content/` 目录下的 Markdown 就是全部数据源。

它同时是两样东西：

- **博客** —— 想清楚才写的长文
- **知识库** —— 项目里踩过的坑，按领域归档，方便下次直接搜到

## 特性

- **纯静态** —— `next build` 产出 17 个 HTML 文件，丢到任何静态托管都能跑，没有任何运行时后端。
- **内容即文件** —— 发一篇文章 = 提交一个 `.md`。没有 CMS、没有草稿状态、没有隐藏字段，文件在就在，不在就不在。
- **黑白双主题** —— 没有彩色强调色。色彩张力归零后，视觉层次全靠排版：反相色块做聚焦、字号音阶做落差、灰阶做三级文字层次。
- **站内搜索** —— `⌘K` 唤起，索引在构建时生成并随页面下发，浏览器端零依赖、零请求。
- **代码高亮在构建时完成** —— Shiki 把代码染色成静态 HTML，明暗主题各一套配色。浏览器不下载任何高亮脚本。
- **RSS** —— `/rss.xml` 同样是构建产物。
- **零 Web Font** —— 中文 Web Font 动辄几 MB，是博客最大的性能杀手，直接不用；改用系统字体栈 + `letter-spacing` / `line-height` 调校。

## 技术栈

| 层 | 选择 | 理由 |
|---|---|---|
| 框架 | Next.js 16（App Router） | `output: 'export'` 纯静态导出；Server Component 在构建时把 Markdown 变成 HTML |
| UI | React 19 | Server Component 为主，只有真正需要交互的组件才下沉到客户端 |
| 样式 | 手写 CSS + CSS 变量 | 样式量小，用变量做双主题比引入框架更可控，也少一层依赖风险 |
| 内容 | Markdown + unified | remark-parse → remark-gfm → remark-rehype → rehype-slug |
| 代码高亮 | Shiki（双主题） | 构建时完成，浏览器零成本，明暗各一套配色 |
| 图标 | lucide-react | 按需 tree-shake，实际只打包用到的几个 |

**运行时依赖只有 Next 和 React。** Markdown 解析、代码高亮、搜索索引全部发生在构建机上，浏览器拿到的直接是静态 HTML。

## 快速开始

```bash
npm install
npm run dev              # 开发服务器 http://localhost:3000
npm run build            # 静态产物输出到 out/
npm run typecheck        # 类型检查
```

预览生产构建（产物是纯静态的，不依赖任何后端）：

```bash
python3 -m http.server 4173 --directory out
# → http://localhost:4173/
```

## 内容发布

**核心原则：Git 仓库就是唯一数据源。**

```
content/
├── posts/        文章，一篇一个文件，文件名即 URL
└── knowledge/    知识条目，按领域分组展示
```

三种发文方式，按场景选：

**方式一：CLI 脚手架（电脑上写）**

```bash
npm run new:post "Vite 插件的 resolveId 踩坑"   # → content/posts/vite-插件的-resolveid-踩坑.md
npm run new:knowledge "Turf 几何校验"           # → content/knowledge/turf-几何校验.md
```

生成的文件已带好 frontmatter 骨架（标题、日期自动填），打开写正文即可。

**方式二：GitHub 网页端新建文件（手机上写）**

打开仓库 → 进 `content/posts/` → Add file → 粘贴下面的 frontmatter 再写正文 → Commit。提交即触发自动构建，一两分钟后线上就更新了。

**方式三：本地手写**

````markdown
---
title: 文章标题
date: 2026-09-15
tags: [react, vite]
summary: 一句话摘要，选填
---

正文从这里开始。支持 GFM 表格、任务列表、删除线。

```ts
const a = 1
```
````

**字段说明**

| 字段 | 必填 | 作用 |
|---|---|---|
| `title` | 是 | 文章标题，缺失则用文件名 |
| `date` | 是 | 决定排序和归档分组。**不用加引号**，日期解析已做兼容处理 |
| `tags` | 否 | 归档页标签云的数据来源 |
| `summary` | 否 | 列表页摘要与 RSS 描述 |
| `domain` / `project` | 知识条目用 | 领域（用于分组）和来源项目，替代 `tags` 的位置 |

阅读时长按中英混排 300 字/分钟自动计算，不需要手填。

**发布**

```bash
git add content/
git commit -m "post: 新文章标题"
git push
```

推到 `main` 后 GitHub Actions 自动构建并发布。

## 站点结构

| 路由 | 板块 | 内容来源 |
|---|---|---|
| `/` | 主页 | 宣言 + 最近文章 + 最近知识 + 简版经历 + 板块入口 |
| `/posts` | 文章 | `content/posts/` |
| `/posts/[slug]` | 文章详情 | 同上，构建时渲染 |
| `/knowledge` | 知识库 | `content/knowledge/`，按 `domain` 分组 |
| `/journey` | 经历 | `lib/journey.ts`，手写结构化数据 |
| `/archive` | 归档 | 按年份 + 标签两个维度索引全部文章 |
| `/about` | 关于 | `app/about/page.tsx` 内联 |
| `/changelog` | 更新日志 | `lib/changelog.ts`，手写；入口只在页脚 |
| `/rss.xml` | RSS | 构建时生成 |

## 设计规范

**主题**：黑白双主题（light 纯白 / dark 纯黑）。色彩张力归零后，「不单调」全靠排版张力——反相色块做聚焦、字号音阶做层次、卡片边界做体积。

改样式时请遵守：

1. **只有两种聚焦手法**：反相色块（`.mark`，黑底白字）和字号落差。没有彩色强调色。
2. **反相色块全站稀缺使用**。多了就不值钱。
3. **不加载任何 Web Font**。用系统字体栈 + `letter-spacing` / `line-height` 调校。

### 几个容易被忽略的细节

| 细节 | 实现 |
|---|---|
| 数字等宽对齐 | `.tnum` → `font-variant-numeric: tabular-nums`，日期竖排成一条直线 |
| 大字号收字距 | 40px 宣言配 `letter-spacing: -0.035em`，字号越大越要收紧 |
| 三级灰阶文字 | `--fg` / `--fg-2` / `--fg-3`，层次靠灰阶不靠颜色 |
| hover 微位移 | 卡片上浮 2px / 200ms，超过 3px 就廉价 |
| 明暗防闪白 | `layout.tsx` 内联脚本在样式生效前定主题；主题图标也由 CSS 的 `[data-theme]` 驱动，hydration 前就是对的 |
| 网格底纹 | `--grid` 与底色的差值控制在极小范围（`#f1f1f1` / `#171717`），过强会显脏 |

### 配色令牌

明暗双模式共用同一套变量名，切换只改 `<html data-theme>`：

| 令牌 | light | dark |
|---|---|---|
| `--bg` | `#ffffff` | `#0a0a0a` |
| `--fg` | `#000000` | `#ffffff` |
| `--fg-2` | `#666666` | `#999999` |
| `--fg-3` | `#9b9b9b` | `#666666` |
| `--line` | `#e6e6e6` | `#232323` |
| `--inverse-bg` | `#000000` | `#ffffff` |

## 目录结构

```
youngke-blog/
├── app/                     # 路由（App Router）
│   ├── page.tsx             # 主页
│   ├── layout.tsx           # 顶栏 / 页脚 / 防闪烁主题脚本
│   ├── template.tsx         # 路由切换进场动画
│   ├── posts/               # 文章列表 + 详情
│   ├── knowledge/           # 知识库列表 + 详情
│   ├── journey/             # 经历（时间线）
│   ├── archive/             # 归档
│   ├── about/               # 关于
│   ├── rss.xml/route.ts     # 构建时生成 RSS
│   └── globals.css          # 全部样式，设计令牌都在这里
├── components/
│   ├── Header.tsx           # sticky 顶栏（滚动后加分隔线）
│   ├── Nav.tsx              # 导航高亮
│   ├── SearchBox.tsx        # ⌘K 搜索面板
│   ├── ThemeToggle.tsx      # 主题切换（日月图标交叉过渡）
│   └── icons.tsx            # GitHub 图标（lucide 1.x 已移除品牌图标）
├── content/
│   ├── posts/               # 文章源文件
│   └── knowledge/           # 知识条目源文件
├── lib/
│   ├── posts.ts             # Markdown 读取 + 渲染
│   ├── knowledge.ts         # 知识库按领域分组
│   ├── journey.ts           # 经历数据
│   ├── changelog.ts         # 站点改动记录（/changelog 页的数据源）
│   └── site.ts              # 站点常量（域名 / 仓库名 / 联系方式）
└── scripts/new.mjs          # 零依赖内容脚手架
```

## 部署

`out/` 是纯 HTML/CSS/JS，任意静态托管都行。完整操作见 [部署教程.md](./部署教程.md)。

站点绝对地址（RSS、metadata 用）通过环境变量 `SITE_URL` 注入，例如 `SITE_URL=https://yourdomain.com`。改域名只动这一个变量。

## 已知取舍

- **搜索是标题级匹配**，不是全文检索。文章量小时够用，引入索引库则与「零依赖」冲突。过百篇再考虑。
- **没有评论**：个人站不需要，也避免引入第三方脚本与审核负担。
- **没有阅读统计**：保持纯静态，不引入任何后端与埋点。需要时优先接第三方统计服务，一行脚本。
- **没有分页**：文章量小，归档页一屏看完。

## License

[MIT](./LICENSE)
