---
title: 大屏适配：rem 方案的取舍
domain: 可视化
project: 泰科质量看板
date: 2026-09-15
tags: [echarts, 大屏, 适配]
---

## 问题

质量看板要投在客户会议室的大屏上，分辨率不固定。直接写 px 会在不同尺寸下留白或溢出。

## 结论

rem 方案的核心就一行：**按屏宽动态改 html 的 font-size**。

```ts
const DESIGN_WIDTH = 1920
function setRem() {
  const scale = document.documentElement.clientWidth / DESIGN_WIDTH
  document.documentElement.style.fontSize = 16 * scale + 'px'
}
setRem()
window.addEventListener('resize', setRem)
```

配合 postcss 插件把 px 自动转 rem（`postcss-pxtorem`），写样式时还按设计稿的 px 写。

## 三个必须处理的细节

**1. ECharts 要手动 resize**
rem 只影响 CSS，canvas 尺寸不会自动跟着变：

```ts
window.addEventListener('resize', () => chart.resize())
```

多个图表时建议用一个统一的注册中心，别在每个组件里各写一遍。

**2. ECharts 内部字号不会跟着 rem 变**
图表里的 `fontSize` 是 canvas 绘制的，单位是 px。要么在初始化时按 scale 算一遍，要么用回调：

```ts
const scale = () => document.documentElement.clientWidth / 1920
title: { textStyle: { fontSize: 14 * scale() } }
```

**3. 极宽屏下 rem 会把字放得过大**
如果是 3840 的超宽屏，等比放大后字会大到离谱。常见做法是限制 scale 上限：

```ts
const scale = Math.min(clientWidth / DESIGN_WIDTH, 2)
```

## 什么时候不该用 rem

- 页面里有大量文本（报表、表格）→ 用 rem 会把正文也放大，阅读体验变差
- 需要精确像素对齐的设计 → rem 有小数误差
- 移动端和桌面端共用一套代码 → `scale` + `transform` 更省事

## 待补充

- `transform: scale()` 方案的对比（优缺各是什么）
- vue-grid-layout 拖拽面板里的图表 resize 时机
