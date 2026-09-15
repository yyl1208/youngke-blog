---
title: turf 做几何质检的几个边界情况
domain: GIS
project: 互联网车企地图编辑器
date: 2026-09-15
tags: [turf, 质检]
---

## 问题

质检模块要判断图层里的几何是否合法，第一版直接用 `turf.booleanValid()`，结果漏检了一堆自相交，还把正常的跨国要素判成非法。

## 结论

`turf.booleanValid()` 只覆盖一部分情况，**自相交必须单独查**：

```ts
import * as turf from '@turf/turf'

// booleanValid 对自相交不敏感，要配合 kinks
const kinks = turf.kinks(feature)
if (kinks.features.length > 0) {
  // 这里才是自相交的点位
}
```

## 四个实际踩到的坑

**1. 自相交用 `kinks`，不用 `booleanValid`**
`booleanValid` 依赖 JTS 的 isValid 语义，对某些自环返回 true。`turf.kinks()` 直接返回交点坐标，更适合拿去做修复提示。

**2. 坐标顺序永远是 [经度, 纬度]**
这是最高频的错误来源。写成 [纬度, 经度] 时 turf 不会报错，只会给出错误结果。前端从高德/Leaflet 拿到的顺序要对齐一次，别在两个库之间来回传。

**3. 闭合环的首尾点必须一致**
Polygon 的 LinearRing 要求第一个坐标等于最后一个。从后端拿到的很多数据不满足，质检前先补一个点：

```ts
const ring = [...coords]
const first = ring[0]
const last = ring[ring.length - 1]
if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first)
```

**4. 面积/长度算出来不对，先查坐标系**
`turf.area()` 返回平方米、`turf.length()` 返回千米，前提是经纬度坐标系（WGS84）。如果数据是投影坐标（比如 Web Mercator 的米），结果会差一个数量级。

## 待补充

- 跨 180° 经线的要素怎么处理
- 质检项的表达式化：怎么让非研发也能配质检规则
