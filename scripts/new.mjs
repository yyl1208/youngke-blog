#!/usr/bin/env node
/**
 * 内容创建 CLI —— 零依赖，只用 node 内置模块。
 *
 *   npm run new:post "文章标题"        新建 content/posts/<slug>.md
 *   npm run new:knowledge "标题"       新建 content/knowledge/<slug>.md
 *
 * 为什么要有这个脚本：
 *   手写 frontmatter 容易漏字段或格式写错，日期也懒得敲。
 *   一条命令生成好骨架，打开就能写正文。
 *
 * 内容一律以目录下的 .md 为准 —— 没有数据库、没有草稿状态、
 * 文件在就在，文件不在就不在。
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

/**
 * 生成 URL 友好的 slug。
 * 中文不做拼音转换（那要引依赖），直接保留中文 —— 现代浏览器与搜索引擎都支持。
 */
function toSlug(title) {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || `untitled-${Date.now()}`
}

/** 本地日期 YYYY-MM-DD（用本地时区，避免 UTC 差 8 小时导致日期错位） */
function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function writeIfAbsent(filepath, content) {
  if (fs.existsSync(filepath)) {
    console.log(`✗ 已存在，没有覆盖：${path.relative(ROOT, filepath)}`)
    return
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, content, 'utf-8')
  console.log(`✓ 已创建：${path.relative(ROOT, filepath)}`)
}

const POST_TEMPLATE = (title, date) => `---
title: ${title}
date: ${date}
tags: [未分类]
summary: 一句话说清这篇写了什么。
---

正文从这里开始。

## 小标题

段落之间空一行。

\`\`\`ts
const hello = '代码块由 Shiki 高亮，明暗主题各自一套配色'
\`\`\`
`

const KNOWLEDGE_TEMPLATE = (title, date) => `---
title: ${title}
domain: GIS
project: 互联网车企地图编辑器
date: ${date}
tags: [踩坑]
---

## 现象

当时看到的是什么样。

## 原因

为什么会这样。

## 解法

最后怎么处理的。

\`\`\`ts
// 关键片段
\`\`\`

## 复盘

下次怎么避免。
`

const [type, ...argv] = process.argv.slice(2)
const title = argv.filter((a) => !a.startsWith('--')).join(' ')

switch (type) {
  case 'post':
    if (!title) {
      console.error('用法：npm run new:post "文章标题"')
      process.exit(1)
    }
    writeIfAbsent(
      path.join(ROOT, 'content', 'posts', `${toSlug(title)}.md`),
      POST_TEMPLATE(title, today()),
    )
    break

  case 'knowledge':
    if (!title) {
      console.error('用法：npm run new:knowledge "标题"')
      process.exit(1)
    }
    writeIfAbsent(
      path.join(ROOT, 'content', 'knowledge', `${toSlug(title)}.md`),
      KNOWLEDGE_TEMPLATE(title, today()),
    )
    break

  default:
    console.log(`youngke blog · 内容 CLI

  npm run new:post "文章标题"      新建文章
  npm run new:knowledge "标题"     新建知识条目

内容直接写进 content/ 下的 .md 文件，提交推送即发布。
手机上可直接在 GitHub 网页端新建文件，效果一样。`)
}
