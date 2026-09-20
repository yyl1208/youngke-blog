---
title: 用 AI 扫描老项目发现的坑
domain: 前端相关
project: 通用
date: 2026-09-19
tags: [AI, 代码审查, 定时器, 内存泄漏]
---

## 问题

用AI来扫描6年前的老项目，会发现一些的问题

代码不一定是我写的，但是相关问题我当时可能也遇到过，值得记录下来

以下是问题内容

## 总结

### 坑一：定时器的清理清单，难在"清单"

大屏是 7x24 挂着的。如果运行越久越卡，或者控制台开始不停输出error，往往是内存泄漏这类问题了

**五六个定时器**。页面切走之后没清掉，就会继续持有已销毁实例的引用，回调里还在 `this.xxx = data`、还在 `dispatchAction`。

单个定时器谁都会清，**难的是"清单"**——只要有任意一个没被写进清理函数，整个 `beforeDestroy` 就白写。
同一个项目里能找到四种漏法：

#### 漏法一：引用置空，没有 clear

```ts
// 漏法一：只把引用置空，没有 clear

// 创建定时器，浏览器后台开启循环
this.timer = setInterval(() => {
  console.log('执行')
}, 1000)

beforeDestroy() {
  this.timer = null          // setInterval 还在跑，只是拿不到了
}
```

> 你只是把 `this.timer` 变量里存的 ID 删掉了，**浏览器那边的定时器线程还在继续跑**，每隔一秒继续执行回调。
> 最坑的：**ID 丢了，再也无法 clearInterval 停止它，造成内存泄漏！**

正确写法：

```js
beforeDestroy() {
  // 先判断存在，再清除定时器
  if (this.timer) {
    clearInterval(this.timer)
    this.timer = null // 可选，置空释放引用
  }
}
```
原理简单理解

- 浏览器：维护一张全局定时器表，`setInterval` 注册任务，返回 ID；
- `this.timer`：只是 JS 对象上存 ID 的一个普通变量；
- `clearInterval(Id)`：**拿着 ID 去通知浏览器全局表删掉这个定时任务**；
- `this.timer = null`：仅仅修改 JS 变量，**不会通知浏览器**。

#### 漏法二：cleanTimer 遗漏清理

```ts
// 漏法二：cleanTimer 遗漏清理
cleanTimer() {
  if (this.timer) clearTimeout(this.timer)
  if (this.errorTimer) clearTimeout(this.errorTimer)
  if (this.cloudTimer) clearTimeout(this.cloudTimer)
}

// 漏法三：各种匿名的异步操作
let flag = infoFn()
if (flag) {
  setInterval(infoFn, 10 * 1000)      // 没有赋值给 this.rotation.timer
}

setTimeout(() => { this.list = left.splice(0, 5) }, 10)
```

项目里也有写对了的样板可以对照：一个是清理函数覆盖全部定时器字段；
另一个更稳——把定时器抽象成有 `stop/suspend/resume` 的类，组件只管调 `stop`。

值得记的三点：

1. **`this.timer = null` 不是清理。** 它跟 `clearInterval` 长得像，读代码的人很容易当成清理放过。判据很简单：`beforeDestroy` 里出现对定时器字段的**赋值**，基本就是漏清了。
2. **`setInterval(fn, ms)` 不接返回值 = 永远无法停止。** 这个特别容易发生在"先执行一次再起周期"的写法里——注意力都在 `infoFn()` 的返回值上，周期定时器的返回值顺手就丢了。而且因为 `clearInterval(this.rotation.timer)` 那行还在，看起来"明明清了"，排查时会误导方向。
3. **手工枚举字段的清理方式注定会腐烂。** 后来加了新定时器，忘了同步加进 `cleanTimer()`。更稳的做法是注册表：

```ts
const timers: Array<() => void> = []
const every = (ms: number, fn: () => void) => {
  const id = setInterval(fn, ms)
  timers.push(() => clearInterval(id))
  return id
}
// beforeDestroy: timers.forEach((stop) => stop())
```

加新定时器不用记得改清理函数。

顺带一个：`import { setInterval, clearInterval } from 'timers'` 是把 Node 核心模块写进了浏览器代码。
webpack 4 默认给 node 核心模块做 polyfill 所以能跑，但一是语义混乱（其它文件都用全局 `setInterval`），
二是 webpack 5 移除了默认 polyfill，升级会直接 `Module not found`。
另外那个用 10ms `setInterval` 驱动 3D 相机旋转的组件（约 100fps），`beforeDestroy` 里清理它的那行是**被注释掉的**——注释掉的清理等于没清理。

**当年为什么没发现**：它不报错，只是切屏后 CPU 降不下来。大屏常年挂着没人操作，没人会去量切屏前后的 CPU。

### 坑二：只写 resolve 不写 reject 的 Promise 包装

大屏最怕的不是报错，是**不报错的卡死**：屏还亮着、数据不动、控制台干净，值班的人根本不知道它已经死了几小时。

`new Promise((resolve) => { ... })` 这种**只有一个参数**的包装在项目里出现了好几次——它意味着失败分支被整个丢掉了。三个现场：

```ts
// 现场一：空数据时不 resolve，首屏永远不加载
queryId() {
  return new Promise<void>((resolve) => {
    queryId().then((data: any) => {
      if (data.length) {          // 只有非空才 resolve
        resolve()
      }
      // data 为空数组时：Promise 永久 pending
    })
  })
}
mounted() {
  this.queryRegDeviceId().then(() => { this.initData() })   // 网关列表为空 => 整屏空白
}

// 现场二：轮询的续期写在 then 里，catch 里没续——一次失败，永久停摆
initData() {
  this.monitorInfo()
    .then(() => {
      this.timer = setTimeout(() => { this.initData() }, this.interval)   // 续期只在这里
    })
    .catch(() => {
      this.initOther()   // 拿了数据，但没有重新 setTimeout
    })
}
// 后端挂一次（网关重启、网络抖动、500），这屏就再也不刷新了

// 现场三：请求失败时既不 resolve 也不 reject
return new Promise((resolve) => {
  axios.get(path).then((res) => { resolve(res.data) })
  // 没有 .catch：404 或断网时永久 pending
})
// 调用方：地图下钻点了没反应，且没有任何报错
```

两条规则：

1. **`new Promise((resolve) => ...)` 这种单参数写法本身就是红旗。** 只要你在包一个异步操作，就要把成功和失败两个出口都接出来。最省事的是**根本别包**——直接 `return request(...)` 让调用方 `.then/.catch`，或者 `async/await` + `try/catch`。
2. **轮询的续期必须放 `finally`，不能放 `then`。** `then` 里的续期意味着"成功才继续下一次"，而轮询恰恰是失败时更需要继续。

```ts
async initData() {
  try {
    await this.monitorInfo()
  } catch (e) {
    // 记录一次失败，可累加连续失败次数做降级/告警
  } finally {
    this.initOther()
    this.timer = setTimeout(() => { this.initData() }, this.interval)
  }
}
```

还有两个容易跟着一起犯的：

- **`if (data.length)` 里 resolve 是最隐蔽的一种。** 它 99% 的情况下工作正常，只在"新环境刚部署 / 设备全部离线 / 账号没配权限"时触发，而那恰好是最需要看到提示的时候。所有分支都要收口。
- **没有 `onerror` 的 `Image` 是同类问题的变种**：图片 404 时 Promise 永不 resolve，调用方卡在 `await` 上，外层那个"等待就绪"的 `setTimeout` 重试会**无限重试下去**，既没有次数上限也没有超时放弃。等待就绪的重试必须带上限或超时。

**当年为什么没发现**：成功的路径一直是对的，失败的路径从来没被测过。

---

总结：

利用AI产出有个非常大的问题，如果你让他输出的内容是你自己带很强主观意见的产物，那么它和你的想法就会差距很大了

比如说博客，AI也的很工整，但确实缺少了自己的味道

利用AI提升、学习，但是对于AI的产物也需要很大的精力去Review

所以还是尽量让他做确定的事儿，获许结果更确定 （类似发现问题、解决问题

但是输出博客这种意向化的产物如果想要自己满意，还需要喂很多东西，让他学习

或许以后Vibe Coding AI也不会犯这些错误，但是当我们遇到这些错误时，自己还需要有基本的判断能力

利用AI生成代码，也得去理解他实现的逻辑，不然如何判断AI对错

又或许...也可以让另一个AI去判断、审核呢...
