---
title: Next.js 16 的 App Router：三个我踩到的点
date: 2026-09-14
tags: [nextjs, react]
summary: params 变成 Promise 了、静态导出到底能做什么、以及 Server Component 在这个站上省掉了什么。
---

用 Next.js 16 重写博客，踩到三个点。都是看文档时觉得"知道了"，真写才发现有坑的地方。

## 一、params 是 Promise 了

Next 15 起的破坏性变更，16 继续。动态路由的参数必须 await：

```tsx
// 错：直接解构
export default function Post({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)   // params.slug 是 undefined
}

// 对
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
}
```

类型上写了 `Promise<...>` 但忘了 await，TS 不会报错——因为 `await` 一个非 Promise 也合法。所以这个坑只能靠自己记住。

## 二、output: 'export' 的边界

静态导出后产物在 `out/`，能直接丢 GitHub Pages。代价是这些用不了：

- 服务端重定向（`next.config` 的 `redirects` 仍可用，但 `middleware` 不行）
- 图片优化（要设 `images.unoptimized: true`）
- 运行时读取请求头

对这个站没影响——文章在构建时就已经变成 HTML 了。**判断标准很简单：如果一页的内容对所有访客都一样，就该静态化。**

配 `trailingSlash: true` 是为了 GitHub Pages 的目录索引，否则 `/archive` 会 404，得写成 `/archive/index.html`。

## 三、Server Component 到底省了什么

这个站的文章正文是 Markdown，走 unified → remark → rehype → Shiki 渲染成 HTML。

如果把这套管线放到客户端，光 Shiki 的语法定义就有几百 KB，加上解析逻辑，首屏 JS 得奔着 1MB 去。

放在 Server Component 里，这些**只发生在构建时**，浏览器拿到的直接是渲染好的 HTML：

```
构建时：Markdown → HTML 字符串
运行时：HTML 字符串 → 浏览器
```

客户端只剩下 React 运行时和一个 11 像素的圆点（主题切换按钮）。全站 JS 不到 100KB。

这是 Server Component 最实在的价值——不是"不用写 useState"，是**把不该在浏览器里跑的东西留在构建机上**。
