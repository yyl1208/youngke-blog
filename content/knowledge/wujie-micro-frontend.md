---
title: 无界微前端的通信与样式隔离
domain: 微前端
project: 珂阳工作流平台
date: 2026-09-15
tags: [微前端, wujie, 架构]
---

## 问题

工作流平台要集成多个团队的子应用，选了无界（wujie）。落地时最头疼的不是加载，是通信和样式串味——子应用的弹窗挂到了 body 上，样式直接污染全局。

## 结论

无界的隔离原理是 **iframe 跑 JS + webcomponent 挂 DOM**，所以 JS 天然隔离，但 **DOM 仍然挂在主应用的 document 里**。这意味着：

> 样式隔离要靠 `shadowRoot`，但它不是默认开的，而且开了之后弹窗类组件会出问题。

## 通信三种方式，按场景选

```ts
// 1. props：一次性传值，子应用 props 变化时不会自动更新
<WujieVue name="flow" :url="url" :props="{ token, userInfo }" />

// 2. eventBus：主子双向，适合事件型通信
import { bus } from 'wujie'
bus.$on('flow-saved', handler)
bus.$emit('refresh-list')

// 3. window 通信：子应用里拿主应用的 window
window.$wujie.props
window.parent
```

**选型建议**：配置类用 props，动作类用 bus，不要用 bus 传大量状态——没有响应式，容易两边不同步。

## 弹窗为什么要特殊处理

子应用的 Modal / Dropdown 默认 `appendToBody`，渲染到主应用 document 上，拿不到子应用的样式，表现就是"弹窗没样式"。

解法是把弹窗挂载点改到子应用容器内：

```ts
// 子应用入口，以 element-plus 为例
app.use(ElementPlus)
// 或单独指定
ElMessageBox 的 appendTo 指向 #app 内部节点
```

另一种更省事的做法：主应用统一提供一套弹窗样式，子应用全部走主应用的组件（需要约定版本）。

## 为什么选无界而不是 qiankun

- qiankun 是基于 single-spa 的路由劫持，样式隔离要开 `strictStyleIsolation`（也是 shadow DOM，同样有弹窗问题）
- 无界的 JS 沙箱是 iframe，比 qiankun 的 Proxy 沙箱更彻底，子应用用了哪些全局变量都不用管
- 代价：无界对 Vite 子应用的支持需要额外处理（dev 模式的 module script）

## 待补充

- Vite 子应用在 dev 模式下的接入方式
- 子应用之间共享依赖（Vue/React 单例）怎么避免重复打包
