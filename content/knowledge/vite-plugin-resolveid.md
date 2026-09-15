---
title: vite 插件里 resolveId 的三个坑
domain: 工程化
project: 通用
date: 2026-09-15
tags: [vite, 插件, 构建]
---

## 问题

写 vite 插件做虚拟模块（把配置注入成 `virtual:config`），import 一直报 `Failed to resolve import`。

## 结论

三个坑，按顺序排查：

### 1. 虚拟模块 id 要加 `\0` 前缀

```ts
const VIRTUAL_ID = 'virtual:config'
const RESOLVED_ID = '\0' + VIRTUAL_ID

export default function myPlugin() {
  return {
    name: 'my-plugin',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) return `export default ${JSON.stringify(config)}`
    },
  }
}
```

`\0` 是 rollup 的约定，用来标记「这不是真实文件」。不加的话，其他插件会尝试按文件路径去解析它，然后失败。

### 2. 返回 null 表示「我不处理」，不是「没找到」

`resolveId` 返回 `null` 会继续走后面的插件；返回 `undefined` 同理。**千万不要返回空字符串**，那会被当成成功解析。

### 3. 虚拟模块里不能用相对路径 import

`load` 返回的代码是在虚拟模块上下文里执行的，写 `import './foo'` 会解析失败。要么写成绝对路径，要么把依赖也做成虚拟模块。

## 插件顺序

`enforce: 'pre'` 在 vite 核心插件之前跑，`'post'` 在之后。

- 要**拦截** vite 默认行为 → `pre`
- 要**处理** vite 产出后的结果 → `post`
- 虚拟模块一般用默认的（不设 enforce）就够了

## 待补充

- HMR 时虚拟模块怎么触发更新（`handleHotUpdate`）
- 插件里读不到最终 config 的问题（`configResolved` vs `config`）
