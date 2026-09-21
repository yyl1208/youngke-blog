---
title: 洋葱模型：中间件到底是怎么一层层套进去的
domain: 前端相关
project: 通用
date: 2026-09-21
tags: [Node.js, 中间件, 前端]
summary: 从 Express 的"排队"到 Koa 的"回穿"，用一段 compose 代码把洋葱模型拆开——为什么 await next() 之后还能拿到响应阶段。再对照 Java 的 Filter 链、Interceptor 和 AOP：同一个思想的三种语法。
---

> 面试题：Koa 的洋葱模型是什么？和 Express 的中间件机制差在哪？

很多前端第一次见洋葱模型，是看 Koa 文档里那张图：请求从外层钻进去，再从中心穿出来，中间件代码写两段、执行两次。图看懂了，代码一写还是懵——为什么 `await next()` 前后是两个阶段？

这篇把这个模型拆到底：先说 Express 的老机制差在哪，再手写一个最小可用版本，最后说清楚它能干什么、不能干什么。

## 一、Express 的问题：请求能进来，出不去

Express 的中间件是**排队**模型：

```js
app.use((req, res, next) => {
  console.log('第一个进来了')
  next()
})
app.use((req, res, next) => {
  console.log('第二个进来了')
  res.send('done')
})
```

执行顺序是 1 → 2，`next()` 把控制权交出去就**不回来了**。想在"响应已经发出去之后"做点什么——比如统一记录耗时、打点埋点——没有干净的位置。你要么在每个中间件末尾自己计时（写重复代码），要么监听 `res` 的 `finish` 事件（绕圈子）。

本质问题：**Express 的中间件只有"进"的阶段，没有"出"的阶段。** 响应是流式写出去的，中间件插不上手。

## 二、Koa 的答案：把 next 变成一个可等待的 Promise

Koa 的写法：

```js
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()                          // 往里走，等里面全部执行完
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}ms`) // 回到这一层，响应还没真正发出
})
```

`await next()` 前是"进"的半段，后面是"出"的半段。三个中间件摞起来，执行顺序就是洋葱图：

```
A(前) → B(前) → C(前) → C(后) → B(后) → A(后)
```

关键在于 `next()` **返回一个 Promise**，它 resolve 的时机是"里面所有中间件都走完了"。于是外层 `await` 等到的时刻，天然就是"响应阶段"——耗时统计、统一错误处理、改响应头，都有了落脚点。

## 三、手写一个最小的 compose

洋葱模型的全部秘密在 `koa-compose` 里，核心不到二十行：

```js
function compose(middlewares) {
  return function (ctx) {
    function dispatch(i) {
      const fn = middlewares[i]
      if (!fn) return Promise.resolve()
      return Promise.resolve(
        fn(ctx, () => dispatch(i + 1))  // next 就是"执行下一层"
      )
    }
    return dispatch(0)
  }
}
```

拿三个中间件跑一遍：

- `dispatch(0)` 调中间件 A，把 `() => dispatch(1)` 当作 `next` 传进去
- A 执行前半段，`await next()` 实际是 `await dispatch(1)`
- `dispatch(1)` 调 B，B 再 `await dispatch(2)`……到最后一层 `dispatch(3)` 没有中间件了，返回一个立即 resolve 的 Promise
- 这个 resolve 沿着 await 链一路往外冒，C 的后半段先跑，然后 B、然后 A

所以**洋葱的"回穿"不是什么新机制，就是 Promise 的 resolve 链**：往里钻靠函数调用，往外穿靠 await 恢复。理解了这一点，所有变体都不神秘了。

还有个细节：`next()` 被同一个中间件调两次会报错（compose 里做了守卫）——因为再调一次就等于把里面的洋葱再穿一遍，时序全乱。

## 四、这模型真正值钱的是统一错误处理

Express 时代错误处理要专门注册四参数的错误中间件，和普通中间件是两套写法。Koa 里因为"出"的阶段存在，最外层一个 try/catch 就能兜住全部：

```js
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = { message: err.message }
  }
})
```

任何一层抛的错，都会沿着 await 链冒泡到这。**中间件从"过滤器"变成了"切面"**——横切关注点（日志、鉴权、计时、错误兜底）终于有了统一的挂载方式。这其实和后端 AOP 的思路是同一个：把"每层都要做的事"收到洋葱的外壳上。

## 五、洋葱模型没解决的问题

它给了"出"的阶段，但没改变 Node 的单线程本质：

- **某个中间件里的同步重计算照样卡死整个进程**——洋葱只重排执行时序，不创造并发
- **`await next()` 之外的并行要自己写**：想让两个不依赖的下游查询同时发，得 `Promise.all`，模型不会帮你
- **中间件顺序仍然要人脑维护**：解析 body 要在用 body 的中间件前面，错了就是玄学 undefined

一句话：洋葱模型解决的是**控制流的可组合性**，不是性能，也不是并发。

## 六、Java 那边早就有了：Filter 链、Interceptor、AOP

我写 Java 那两年，天天在用的其实是洋葱模型的亲戚。第一次看 Koa 那张洋葱图，愣了一下——这不就是 `doFilter` 吗。

**最像的是 Servlet Filter 链**：

```java
public class LogFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        long start = System.currentTimeMillis();
        chain.doFilter(req, res);            // 这行就是 await next()
        System.out.println("耗时 " + (System.currentTimeMillis() - start));
    }
}
```

`chain.doFilter()` 之前是"进"，之后是"出"——和 `await next()` 前后两段一一对应。Tomcat 把 Filter 串成链，最后一个 Filter 之后才到 Servlet，回来再逐层执行后半段。**洋葱模型不是 Koa 发明的，Servlet Filter 链跑了二十多年了**，连"不调 next 就短路请求"（Filter 里不调 `chain.doFilter` 直接写响应）都是同款行为。

三套机制和 Koa 的对照：

| Java 机制 | 对应洋葱里的什么 | 后置逻辑怎么写 | 层间状态怎么传 |
| --- | --- | --- | --- |
| Servlet Filter 链 | `chain.doFilter()` 就是 `next()` | doFilter 调用之后写 | Filter 实例成员 / 请求属性 |
| Spring Interceptor | `preHandle` / `postHandle` / `afterCompletion` | 拆成三个显式回调方法 | request attribute |
| AOP `@Around` | `proceed()` == `await next()` | 同一个方法里 proceed 前后写 | 局部变量（同 Koa） |

值得咂摸的是三种"后置"的写法：

- **Filter 和 AOP**跟 Koa 一样，一个方法里前后两段，局部变量直接复用（`start` 在后半段还能用）
- **Interceptor** 把前后拆成三个方法，类是单例、多请求并发跑，**不能往成员变量里塞状态**，preHandle 里算的东西要传给 postHandle 只能走 `request.setAttribute`——Koa 用闭包白拿的能力，Spring 得显式搬运

### AOP 顺着多说一步：它的设计本身

AOP 值得单独展开，因为它是这套思想里**设计得最完整**的一个。

先看它想解决什么。`logTime` 这种逻辑，如果手动塞进代码，每个方法都要写一遍：

```java
public Order createOrder(...) {
    long start = System.currentTimeMillis();
    // ...业务五十字...
    log.info("耗时 {}", System.currentTimeMillis() - start);
    return order;
}
```

日志、事务、权限、重试——这类"每个方法都要、但和业务无关"的逻辑，OOP 没有干净的放法，塞哪都是污染。AOP 给的答案是把它们抽成**切面（Aspect）**，用配置声明"切在哪"，而不是改业务代码。这套词汇表是：

- **切面（Aspect）**：横切逻辑本身，比如"耗时日志"这个类
- **切点（Pointcut）**：切在哪——通常是一段表达式，"service 包下所有 save 开头的方法"
- **通知（Advice）**：切到之后干什么——前置、后置、环绕、异常
- **织入（Weaving）**：把切面装到目标方法上的动作——编译期、类加载期，或 Spring 默认的**运行期动态代理**

四者里真正体现设计巧思的是**织入**。Spring 的做法：容器里每个 Bean，如果有切面要切它，IoC 就不给你原始对象，给你一个**代理对象**——调用方毫无感知，调的还是"那个 Bean"，实际先经过代理，代理里把通知逻辑套在真方法外面。Koa 是框架层显式地 compose 你的中间件；Spring 是把"套洋葱"这件事藏进了依赖注入，**业务代码完全看不见洋葱存在**。

Spring AOP 的能力边界也要知道：它靠动态代理，**只能代理 Bean 的方法调用**。同类内部 `this.save()` 不走代理（经典坑：事务注解在内部调用时失效）；字段、构造器都切不了——要更强就得 AspectJ 的编译期织入。而 `@Around` 通知长得和 Koa 中间件一模一样不是巧合：

```java
@Around("execution(* com.x.service.*.save*(..))")   // 切点：切在哪
public Object logTime(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.currentTimeMillis();
    Object result = pjp.proceed();                    // proceed() == await next()
    log.info("{} 耗时 {}", pjp.getSignature(), System.currentTimeMillis() - start);
    return result;
}
```

`pjp.proceed()` 之前是"进"，之后是"出"——就是 `await next()`。区别只在 proceed 是同步调用（要手动把返回值传出去），next 是等待一个 Promise。

所以把 Koa 放回这张大图里：**洋葱模型是"执行结构"，AOP 是"把执行结构装进工程的设计"**。Koa 给了执行结构，挂不挂、挂几层要你自己 compose；AOP 连"怎么声明挂载、怎么织入、怎么对业务无感"都设计好了。理解了这个差位，也就理解了为什么 NestJS 要同时抄这两样——中间件管请求层，装饰器 + 依赖注入（`@Injectable`、guard、pipe、interceptor）管方法层，拼出来才是 Spring 的完整体验。

真正的差异不在模型，在**挂载层级**：Koa 中间件只挂在 HTTP 这一层；Java 的 AOP 能切到任意方法层（service、dao），Filter 在 HTTP 层、Interceptor 在 MVC 层，是分层的洋葱。所以 Node 生态里"请求级的横切"用中间件、"方法级的横切"反而没统一方案（装饰器各写各的）；Spring 这边一层洋葱套一层洋葱，覆盖得更全，代价是每个概念都要学一遍。

对写惯 Java 的人，记法就一句：**`await next()` = `chain.doFilter()` = `proceed()`，同一个思想的三种语法。**

## 七、谁在用这个模型

- **Koa**：教科书实现，`async/await` 原生
- **Egg**：基于 Koa，洋葱模型照搬，加了约定和插件体系
- **Redux**：`applyMiddleware` 的 compose 思路同源，只是没有"响应"，纯函数管道
- **Java 全家桶**：Filter 链、Interceptor、AOP `@Around`（见上一节）
- **Vue / React 生态的请求库、SSR 框架**（如 Nuxt 的 server middleware）也能看到同款结构——只要"进 → 处理 → 出"三段式的场景，洋葱都是候选模型

面试收个尾：Express 是排队，Koa 是回穿；回穿的实现就是 Promise resolve 链，compose 二十行能写出来；它买到的核心能力是横切关注点的统一挂载，Java 那边 Filter 链和 AOP 是同一个思想的老乡，但它不解决单线程阻塞和并发。能把"await next 之后为什么还没发出响应"讲清楚，这道题就立住了。
