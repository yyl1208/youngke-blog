---
title: 用 AI 重读旧代码：三个当年没发现的坑
domain: 工程化
project: 通用
date: 2026-09-19
tags: [AI, 代码审查, 定时器, Promise, webpack]
---

## 问题

离职之后有时间把以前的项目翻出来重读，这次多了个帮手：把整个目录丢给 AI，让它按"找坑"的口径扫一遍。

扫出来的东西里，最有价值的不是"这里写错了"，而是**一类当时根本不会去看的地方**。
下面三个坑，每一个在当年都有机会被发现，但每一个都因为同样的原因被放过了：
**它们都不在出事的现场。** 报错的、被用户投诉的那几行永远有人看，而这些代码从来不报错——它们只是安静地漏着、安静地卡着、安静地把一堆用不到的东西打进产物。

## 总结

### 坑一：定时器的清理清单，难在"清单"

大屏是 7x24 挂着的。一块屏上同时跑着数据轮询、列表轮播、3D 相机旋转、异常条目滚动动画，
**五六个定时器**。页面切走之后没清掉，就会继续持有已销毁实例的引用，回调里还在 `this.xxx = data`、还在 `dispatchAction`。

单个定时器谁都会清，**难的是"清单"**——只要有任意一个没被写进清理函数，整个 `beforeDestroy` 就白写。同一个项目里能找到四种漏法：

```ts
// 漏法一：只把引用置空，没有 clear
beforeDestroy() {
  this.timer = null          // setInterval 还在跑，只是拿不到了
}

// 漏法二：setInterval 的返回值根本没接住
let flag = infoFn()
if (flag) {
  setInterval(infoFn, 10 * 1000)      // 没有赋值给 this.rotation.timer
}
// ...于是 beforeDestroy 里的 clearInterval(this.rotation.timer) 永远清的是 null

// 漏法三：清理函数漏字段
cleanTimer() {
  if (this.timer) clearTimeout(this.timer)
  if (this.errorTimer) clearTimeout(this.errorTimer)
  if (this.cloudTimer) clearTimeout(this.cloudTimer)
  // riskAnimationTimer 不在这份清单里，但它确实存在、确实在被赋值
}

// 漏法四：匿名定时器，压根没变量可清
setTimeout(() => { this.riskList = left.splice(0, 5) }, 10)
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
queryRegDeviceId() {
  return new Promise<void>((resolve) => {
    queryRegDeviceId().then((data: any) => {
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

### 坑三：动态 require 把整个 assets 目录拖进构建

大屏项目图片多：`src/assets` 一共 22MB，单张背景图就有 1.3MB、616KB、472KB。
为了按名称动态取图，项目里有五处动态 `require`：

```ts
// 最宽的一处：上下文 = src/assets 整棵目录
getImg(imgUrl: string) {
  return imgUrl.indexOf("http") > -1 ? imgUrl : require(`@/assets/${imgUrl}`)
}

// 稍窄一点：上下文锁在某个子目录
return require(`@/assets/assetCenter/${name}.png`)
```

webpack 遇到 `require(表达式)` 时无法静态分析，会给**前缀目录**生成一个 context module（默认递归、按后缀匹配），
把该目录下所有文件都纳入构建图。也就是说：最宽的那一处让 `src/assets` 下的**所有图片**都进了产物，
而它实际只会用到其中几张图标。

把"动态"换成"静态枚举"，让 webpack 能静态分析：

```ts
// 改法一：显式静态导入 + 映射表（推荐，能享受 tree-shaking 和拼写检查）
import iconBlue1 from '@/assets/operate/icon/blue_icon1.png'
const ICON_MAP: Record<string, string> = { 'blue_1': iconBlue1, /* ... */ }
getImg(item: any) {
  return ICON_MAP[`${item.riskState ? 'red' : 'blue'}_${item.terminalType === '其他' ? '2' : '1'}`]
}

// 改法二：确实要批量时，用 require.context 明确限定目录和正则
const ctx = require.context('@/assets/operate/icon', false, /\.png$/)
```

三个连带后果：

1. **路径写错只在运行时炸。** 静态 `import` 拼错是**编译期**报错；动态 `require` 拼错是**运行时** `Cannot find module`，而且只在真的滚到那个分支时才炸——大屏挂着没人操作，可能几天后才发现。
2. **小图会被内联成 base64 塞进 JS。** 一旦整个目录成了 context module，目录里所有小图标都会被内联进同一个 chunk，体积悄悄涨上去，看 bundle 分析时这些字符串分散各处、不容易归因。
3. **换客户交付时会带走别家的图。** 这个项目是一套代码多客户交付（`build:iot` / `build:fanpu` / `build:yy`），
   而最宽的那处覆盖整个 `src/assets`，等于每个客户的产物里都带着其它客户的背景图和 logo。

**ps：这里应该是当时多租户取图方式的设计思路不一样**——动机是让取图这件事可配置，手段用错了。
关键区分在于**运行时多租户**和**构建期多客户**是两回事：
如果是运行时多租户（一套部署服务多个租户，取图地址从配置里来），动态 require 满足不了——webpack 在构建期就要确定上下文，运行时的字符串它管不着；
而实际交付方式是构建期多客户（每个客户单独 build），那"运行时切换"的能力根本用不上，配置化用环境变量 + 静态映射就够了。

**当年为什么没发现**：产物能跑、图能显示，没人量过产物里到底塞了多少张图。

---

三个坑放在一起看，共同点是：**它们都藏在"没出事"的路径上。** 人肉 review 的注意力天然被报错和用户体验牵引，
而 AI 扫代码的好处恰恰是它没有注意力偏好——同一个口径，二十个文件一视同仁地过一遍。

所以这次重读真正改变的不是代码，是我 review 时的习惯：
看到 `beforeDestroy` 先找"清单全不全"，看到 `new Promise(` 先看"参数是不是只有一个"，
看到 `require(` 里面是模板字符串就先问"这个目录有多大"。
