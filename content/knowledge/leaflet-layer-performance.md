---
title: leaflet 图层上千之后怎么扛
domain: GIS
project: 互联网车企地图编辑器
date: 2026-09-15
tags: [leaflet, 性能]
---

## 问题

地图编辑器里一个业务图层动辄几千个要素，默认用 SVG renderer 全量渲染，拖一下地图就卡成幻灯片，删除单个要素也要全量重绘。

## 结论

按要素量级分三档处理，不要一开始就用最重的方案：

| 要素量级 | 方案 |
|---|---|
| < 500 | 默认 SVG，够用，还要保留点击事件就别换 |
| 500 — 5000 | 换 `L.canvas()` renderer，或减少 DOM 节点 |
| > 5000 | Canvas + 分块加载 + 抽稀，或改用矢量瓦片 |

**最先该做的一步**是把 renderer 换成 canvas：

```ts
const map = L.map('map', {
  renderer: L.canvas({ padding: 0.5 }),
})
```

这一个参数能解决大半问题，因为 SVG 每个要素都是一个 DOM 节点，canvas 只有一张画布。

## 几个容易踩的点

**1. canvas renderer 下 hit test 靠遍历** —— 要素多时点击会变慢。折中做法是 hover 用 canvas、click 用 `map.on('click')` 自己算最近要素。

**2. `LayerGroup` 不等于性能提升** —— 它只是批量增删的容器，节点数没变。真正有用的是 `FeatureGroup` + 一次性 `addData()`，而不是循环 `addLayer()`。

**3. 频繁更新用 `setLatLngs` 而不是重建 layer** —— 编辑场景下拖动顶点是高频操作，重建 layer 会触发整层重绘。

**4. 抽稀要在数据层做，不要在渲染层做** —— 用 `turf.simplify()` 按当前 zoom 决定精度，zoom 变了再重新抽稀。渲染层只在视野内画（`map.getBounds()` 过滤）。

## 待补充

- 矢量瓦片（geojson-vt）接入后的实测对比
- 编辑态与非编辑态要不要用两套 renderer
