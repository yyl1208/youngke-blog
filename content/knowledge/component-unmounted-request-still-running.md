---
title: 组件销毁了请求还在跑：取消该放在哪一层
domain: 前端相关
project: 通用
date: 2026-09-19
tags: [面试题, 内存泄漏, AbortController, 竞态, vue, react]
---

## 问题

面试被问过：`useEffect` 里发了个请求，组件销毁时没处理，会怎么样。

我答内存泄漏，又答用 `AbortController` 在 cleanup 里取消。

这其实设计一个非常常见的场景：**列表页发了个慢查询，人没等，直接点菜单跳走了。**

那个请求还在飞。等它回来，组件早没了。这时候出三件事，只有第一件能叫内存泄漏：

1. 回调里 `this.list = res.data`，给一个已经没人用的实例赋值。数据白算一遍，实例被回调持有，回收不掉。
2. **旧数据盖新数据。** 如果新旧页面共用 store 里的状态（筛选条件、字典、当前租户），
   晚回来的旧响应会把新页面刚拉的数据盖回去。用户看到的是"我明明切到了 B 页面，怎么显示的是 A 的"。
3. 请求在 A 页面发出、在 B 页面失败，报错弹窗弹在 B 页面上，用户完全对不上号。

第二件才是真要命的。它不崩、不报错，就是数据偶尔不对一次，测试环境复现不了。

所以准确的答案应该是：**内存泄漏只是最轻的那个后果，真正花钱的是竞态。**

## 结论

重点不是"怎么 abort 一个请求"，而是**取消这件事该放在哪一层**。
放在组件里，每个写页面的人都要记得一次，忘一次就是一个 bug；放在请求层，写页面的人根本不需要知道有这件事。

### 老项目怎么解的：三层取消

一个 Vue 2.6 + axios 的老后台，超时设的 120 秒（内部系统里资产全量扫描、威胁趋势聚合，后端跑几十秒是常事）。
它在框架层把这件事做掉了，页面代码完全不用管：

```js
// 请求拦截器：每个请求把自己的 cancel 注册进全局数组
if (!config.cancelToken) {
  config.cancelToken = new axios.CancelToken((cancel) => {
    window._axiosPromiseArr.push({ cancel })
  })
}
```

```js
// 路由守卫：切路由时全部取消
router.beforeEach((to, from, next) => {
  window._axiosPromiseArr.forEach((ele, index) => {
    ele.cancel()
    delete window._axiosPromiseArr[index]
  })
})
```

发请求的人不用管取消，跳路由的人也不用管谁发了请求。两处配合，中间靠一个数组。

翻细一点，它其实不止两处，是三层：

- **全局**：路由守卫，切路由时兜底。
- **页面级**：公共 mixin 里挂 `requestCancel()`，翻页、切筛选、重查前手动调。
- **接口级**：少数接口把 cancel 交回调用方自己保管，同一个接口后一次盖前一次。

第三层顺带解释了拦截器里那句 `if (!config.cancelToken)`：自己带了的就不再往全局数组里塞，免得一个请求被两条线管。

### 两个没做干净的地方

**一是 `delete` 只留了个空洞。** `delete arr[index]` 不改长度，只在那个位置留空洞。
`forEach` 会跳过空洞，所以功能一直是好的——但数组长度只增不减，等于"累计发过多少请求"而不是"当前有几个在飞"。
后台开一天，长度涨到几千很正常。一行就能修：遍历 cancel 完直接 `window._axiosPromiseArr = []`。

**二是取消被当成了失败。** 请求 cancel 之后以 reject 结束，走进响应拦截器的错误处理，
而那里两个分支 return 的是同一个东西，等于没处理。没判 `axios.isCancel`，
主动取消和真失败被一视同仁地扔给调用方，项目里能看到的应对是调用处写个空 `.catch(() => {})`——民间补丁，靠自觉。

该在拦截器里分流：

```js
(error) => {
  if (axios.isCancel(error)) return new Promise(() => {})   // 静默，后面的 then/catch 都不跑
  return Promise.reject(error)
}
```

永不 settle 的 Promise 是个小技巧，调用方一行都不用改；代价是它永远悬着，`await` 且没超时兜底的代码就再也不往下走了。
介意的话就 reject 一个带标记的错误，让调用方自己判 `isCancel`，我倾向这种，显式一点。

### CancelToken 已经废弃了

axios 0.22 起 `CancelToken` 进 deprecated，官方推荐 `AbortController`。
换成原生的好处是不绑 axios——同一个 signal 能传给 `fetch`、能传给 `addEventListener`，也能自己手动 abort。

同样的思路重写一遍，比原版多三件事：用 map 天然去重（同样的请求再来一次先取消前一个）、
有豁免名单（登出请求被取消，后端收不到登出事件是要出事的）、取消在拦截器里静默掉。

不过这版自己也有坑：

- `pending.get(key)?.abort()` 会误伤并发。两个组件同时调同一个接口，后一个把前一个 abort 了。去重应该是可选的。
- `JSON.stringify` 对付不了 FormData，两个不同的上传 key 撞车，互相取消。
- `error.config` 可能是 undefined，网络层直接失败时 `buildKey(undefined)` 当场崩。

三个都能修，但都得显式处理——这也是"把取消收在请求层"的代价：一处写错，全局遭殃。

## vue项目中所有onMounted内调用的异步都需要考虑取消吗

表格在`mounted`异步拉接口**非常普遍**，但这里有一个经典坑：**接口还没返回，组件已经销毁（快速切页），then 回调执行，尝试给表格赋值，Vue 报警告：`Uncaught (in promise) ... attempt to set reactive variable on an unmounted component`**

>
> 不是说接口必须 “掐断请求”，而是**要防止组件卸载后，回调继续更新组件状态**。两种思路：
>
>
> 1. 使用`AbortController`：直接中断网络请求（推荐）
> 2. 加一个`isUnmounted`标记：就算请求回来，也不执行赋值（简单兜底方案）

### 场景：表格 mounted 拉取数据

Vue2 选项式示例

```js
export default {
  data() {
    return {
      tableData: [],
      isUnmounted: false
    }
  },
  mounted() {
    this.fetchTableData()
  },
  methods: {
    async fetchTableData() {
      const res = await api.getTableList()
      // ✅ 兜底判断：组件已经卸载，不赋值
      if (this.isUnmounted) return
      this.tableData = res.data
    }
  },
  beforeDestroy() {
    this.isUnmounted = true
  }
}
```

### 方案 2：AbortController（更好，直接终止请求，节省带宽）

```js
export default {
  data() {
    return {
      tableData: [],
      abortCtrl: null
    }
  },
  mounted() {
    this.abortCtrl = new AbortController()
    this.fetchTableData()
  },
  methods: {
    async fetchTableData() {
      try {
        const res = await api.getTableList({
          signal: this.abortCtrl.signal
        })
        this.tableData = res.data
      } catch(err) {
        // abort 会触发异常，需要区分是手动取消还是业务报错
        if(err.name !== 'AbortError'){
          // 真实接口错误处理
        }
      }
    }
  },
  beforeDestroy() {
    this.abortCtrl?.abort()
  }
}
```

Vue3 Composition 写法（更清爽）

```js
import { onMounted, onUnmounted, ref } from 'vue'
const tableData = ref([])
let controller = null

onMounted(async () => {
  controller = new AbortController()
  try {
    const res = await api.getTableList({ signal: controller.signal })
    tableData.value = res.data
  } catch(err) {
    if (err.name !== 'AbortError') {
      // 业务错误
    }
  }
})

onUnmounted(() => {
  controller?.abort()
})
```

## 两个方案对比

表格

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| `isUnmounted`标记 | 改造简单，老项目低成本；不需要改造 axios/api 封装 | **网络请求还会继续跑完**，只是不赋值；占用后端、带宽 |
| AbortController | 直接中断请求，网络停止，性能更好；没有无效回调 | 需要 api 支持 signal，要处理 AbortError 捕获 |

## 业务取舍（真实开发怎么选）

1. **后台管理系统，大量表格、快速切换标签页** → 优先 AbortController，快速切页面大量 pending 请求堆积，容易造成请求排队、接口并发爆炸。
2. **简单小页面、页面切换不频繁** → `isUnmounted`标记兜底足够，开发成本低。

## 面试延伸考点（经常追问）

>
> 问：只用 isUnmounted 标记，算不算内存泄漏？
> 答：

- 从 Vue 组件角度：**不会触发组件状态更新报错**
- 但是网络请求本身依然在后台完成，Promise 依然 resolve，请求占用资源。请求回调的闭包依然短暂持有组件作用域引用，**短期问题不大，高频快速切换页面会累积请求压力**。

>
> 问：表格请求，有没有完全不用处理的场景？
> 答：页面**加载完之前不会被销毁**（弹窗，不支持快速路由跳转），这种简单场景可以省略。但后台系统多标签快速切换是高危场景，建议统一兜底。

### 如果再被问一次

> 组件卸载后回调还会执行，`setState` 作用在已卸载组件上；更麻烦的是竞态，旧响应晚回来会盖掉新数据。
> 处理分两层：effect 的 cleanup 里用 `AbortController` 真 abort 掉，不只是用标志位丢结果；
> catch 里判断 `AbortError` / `isCancel`，别把主动取消当错误。
> 但组件级只是最细的一层。Vue 3 要么用 `useFetch`，要么在 axios 拦截器 + 路由守卫里统一 cancel，
> 业务代码不用感知，还要留豁免名单给登出、埋点这类不能被取消的请求；
> React 侧要么交给 react-router 的 loader（前提是 signal 传下去），要么交给数据请求库。
> TanStack Query解决方案

### 什么时候别搞这套

- 接口都是毫秒级的内部后台，取消的机会窗口极小。
- 请求幂等、页面之间没有共享状态，旧响应丢了也没人看得出来。
- 有轮询或长连接——取消逻辑得和轮询的生命周期对齐。反过来，主流程有取消机制的话，轮询必须在豁免名单里。

判断标准就一句：**旧响应晚到，用户能不能看出来。**
