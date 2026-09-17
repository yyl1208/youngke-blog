---
title: 用 AST 扫自己的代码：从解析到自定义检查器
date: 2026-09-17
tags: [ast, 工程化, babel]
domain: 工程化
project: 互联网车企地图编辑器
---

故事的起源是这样：

2024 年我刚进项目时，突发奇想，想把组件间的 `import` 画成一棵树——看一眼就知道谁依赖谁。那年 AI 还没到能直接给出可用方案的程度，只能自己想。

想明白的关键一点是：import 关系不是文本匹配能搞定的——`@/` 别名、目录默认 index、省略后缀，用正则写出来全是坑。而 AST 解析出来的树结构里，这事儿容易得多。

于是有了第一版：解析 AST，把引用关系抽出来。

后来同事（素哥）看到这个产物，问了一句：能不能做些脚本，扫一扫项目里的问题？正好那阵子在推前端项目的整体改造优化，手上有一堆「想查但没法查」的东西。

项目大到一定程度，总会出现一类问题：**想查，但没法查**。ESLint 管不了，正则是错的，人肉 review 又看不过来。

这类问题都可以用同一招解决 —— **自己解析 AST，把父链拼成路径串，再用一条尾部正则命中它**。这套东西不需要任何框架，15 行遍历加一条正则就能做出 ESLint 做不到的判断。

下面是从零到能用的完整过程。

## 一、先在脑子里划条线：什么该用 AST

不是所有检查都值得上 AST。我的判断标准只有一条：

> **这个判断需不需要"结构信息"？**

- 数一下连续注释有多少行 → 不需要，读文本就行
- 判断 `if` 的条件和它里面赋值的对象**是不是同一个** → 需要，必须上 AST

用文本能解决的就用文本解决。AST 的代价是要处理别名、作用域、语法变体，能用简单办法解决却硬上 AST，是给自己找麻烦。

## 二、解析：@babel/parser

```js
const parser = require('@babel/parser')

const ast = parser.parse(code, {
  plugins: ['typescript', 'decorators-legacy'],
  sourceType: 'module',
}).program          // ← 取 .program，不是整个 File
```

两个坑：

**1. `plugins` 是白名单，不写就解析失败。** 项目里有 `interface` 就得加 `typescript`，有 `.tsx` 就得加 `jsx`。报错信息通常是「Unexpected token」，看不出是 plugin 缺了。

**2. 返回值要取 `.program`。** `parse()` 返回的是 `File` 节点，真正的语法树在它的 `program` 字段上。后面所有遍历都从 `program` 开始。

## 三、`.vue` 文件怎么办：两阶段 + 行号偏移

`@babel/parser` 不认识 `.vue`。做法是先用 `@vue/compiler-sfc` 把单文件组件拆开，取出 `<script>` 里的源码，再交给 babel：

```js
const { parse } = require('@vue/compiler-sfc')

if (lang === 'vue') {
  const sfc = parse(content)
  const script = sfc.descriptor.script || sfc.descriptor.scriptSetup
  if (!script) return

  lang = script.lang || sfc.descriptor.scriptSetup?.lang || 'js'
  content = script.content
  startLine = script.loc.start.line - 1     // ← 关键
}
```

`@vue/compiler-sfc` 只负责**拆 SFC 描述符**，本身不产出 JS AST。这是两阶段流水线，别指望它一步到位。

### 行号偏移是最容易踩的坑

AST 里的 `loc.start.line` 是**相对 script 块**的：

```vue
<template>          <!-- 1..7 -->
  ...
</template>
                    <!-- 8 -->
<script lang="ts">  <!-- 9 → loc.start.line === 9 -->
const a = 1         <!-- 脚本内第 1 行 → 真实行号 = 1 + 8 -->
</script>
```

所以报行号**必须 `node.loc.start.line + startLine`**。

忘了这一步不会报错，只会让你报出来的行号**看起来像扫到了别的文件**——这是最难查的一类 bug，因为它错得很像对的。

### 顺带说清能力边界

只取 `script` 或 `scriptSetup`，所以 `<template>` 里的模板表达式（`@click="foo(a.b.c)"`）**完全不检查**。要覆盖模板得另外解析，那是另一套东西。

## 四、遍历：手写 15 行，不用 @babel/traverse

```js
function traverseAstNode(obj, callback) {
  if (typeof obj !== 'object' || obj === null) return
  if (obj.type) {
    const next = () => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          traverseAstNode(obj[key], callback)
        }
      }
    }
    callback(obj, next)
  } else if (obj instanceof Array) {
    obj.forEach((_obj) => traverseAstNode(_obj, callback))
  }
}
```

三个要点：

**1. 判定「是不是节点」的依据是 `obj.type` 存在。** 是节点就回调，是数组就逐项递归，其余（`loc`、`start`、`end` 这些数字和对象）直接返回。

**2. 回调是 `(node, next)`** —— 第二个参数是「继续往下走」的续延。**不调用 `next()` 就不会深入子节点**，这就是手动剪枝，等价于 `@babel/traverse` 的 `path.skip()`。

**3. 它不维护父节点，也不提供路径。** 想知道父节点是谁，得自己压栈 —— 这正是下一节的核心。

手写的好处是零依赖、可读；代价是性能比 `@babel/traverse` 差。中小项目无所谓。

## 五、核心技法：把父链拼成路径串，再用尾部正则命中

既然遍历器不给路径，就自己拼：

```js
const nodeStack = []
const pathStack = []

traverseAstNode(ast, (node, next) => {
  nodeStack.push(node)
  pathStack.push(`${pathStack.at(-1) ?? ''}/${node.type}`)

  const endStack = () => {
    next()
    pathStack.pop()
    nodeStack.pop()
  }

  // 判定逻辑写在这里
  return endStack()      // ← 任何分支都必须 endStack，否则栈错乱
})
```

拼出来的路径长这样：

```
/Program/IfStatement/BlockStatement/ExpressionStatement/AssignmentExpression
```

然后**用正则匹配路径尾部**：

```js
// 命中三种形态：if (x) y = 1 / if (x) { y = 1 } / x && (y = 1)
const structReg = /\/(IfStatement(\/BlockStatement)?\/ExpressionStatement|ExpressionStatement\/LogicalExpression)\/AssignmentExpression$/
```

整篇文章如果只记一件事，就记这句：

> **AST 结构匹配 = 把父链拼成路径串 + 尾部正则。**

它等价于 ESLint 的 selector 语法（`IfStatement > BlockStatement > ExpressionStatement > AssignmentExpression`），但用正则实现，**表达力更强**——selector 描述不了的结构，正则可以。

三个必须注意的地方：

- **一定要用 `$` 锚定尾部**，否则会误匹配更深的嵌套
- 路径只记录 `type`，不记录「父节点的哪个分支」。要区分 `if` 的 consequent 和 alternate，得退回 `nodeStack` 用**引用相等**判断：`nodeStack[i + 1] !== parentNode.consequent`
- `return endStack()` 不能漏，任何提前 return 的分支都要先出栈

## 六、归一化：怎么判断「两处引用是不是同一个东西」

很多规则都要回答这个问题。比如 `if (a.b.c == null) a.b.c = {}` 里的条件对象和赋值对象，是不是同一个？

答案是把复合表达式摊平成一个**可比较的串**：

```js
function entityChain(node, scriptContent) {
  const chain = []
  let curnode = node
  while (true) {
    if (curnode.type === 'MemberExpression' || curnode.type === 'OptionalMemberExpression') {
      chain.unshift(getChainMemberExpression(curnode.property, scriptContent, curnode.computed))
      curnode = curnode.object
    } else if (curnode.type === 'TSNonNullExpression') {
      curnode = curnode.expression        // 处理 a!.b
    } else {
      break
    }
  }
  chain.unshift(getChainMemberExpression(curnode, scriptContent, true))
  return chain
}
```

`a.b.c` → `['a', "'b'", "'c'"]`，`join('>>')` 后就能直接比较。

**引号约定是整个设计的关键**，很容易写错：

| 情形 | 结果 | 例子 |
|---|---|---|
| 非计算属性 `a.b` | **加引号** | `'b'` |
| 计算属性 `a[key]` | **不加引号**，原样源码 | `key` |
| 链首 | 按 computed 处理，**不加引号** | `a` |

于是 `if ('c' in a.b) a.b.c = {}` 能匹配上：条件侧拿到带引号的 `'c'`，与目标链末端的 `'c'` 相等。
而 `if (key in a.b) a.b[key] = {}` 是无引号的 `key` 对无引号的 `key`。

**两边规则自洽，所以不用为计算属性单独写分支** —— 这是这套代码里我最满意的一处设计。

顺带要处理 TS 的两个语法：`a!.b`（`TSNonNullExpression`）和 `a?.b`（`OptionalMemberExpression`）。Vue3 + TS 项目里这俩到处都是，漏了就会有大量漏报。

## 七、抑制误报：给规则留个后门

误报是这类工具的死因 —— 第一天报 300 条，第二天就没人看了。

做法是支持注释抑制，原理是从 AST 节点的 `leadingComments` / `trailingComments` 里找标记：

```js
if (test /*@ignore-check */) {
  arr.push(x) //@ignore-check
}
```

```js
const ignoreLines = getIgnoreLines(ast)
// ...
if (ignoreLines.includes(node.loc.start.line)) return endStack()
```

**注意语义**：它比的是「注释所在行」，不是「节点所在行」。同一行任何位置的抑制标记都会屏蔽该行的所有报告 —— 粒度粗，但实现简单，够用。

## 八、跨平台陷阱：路径分隔符

这个坑很隐蔽，但会让你在 Windows 上白干一天。

如果你的过滤规则写成 `filePath.startsWith('src/vendor')`，那么在 Windows 上 `path.join` 产出的 `src\vendor` **永远匹配不上**，而且不报错 —— 只是什么都没过滤掉。

解法是把 `path` 全套包一层，强制转成正斜杠：

```js
const path2 = {
  normalize: (p) => path.normalize(p).replace(/\\/g, '/'),
  join: (...ps) => path.join(...ps).replace(/\\/g, '/'),
  sep: '/',
}
```

## 九、能抓什么：七类真实可用的模式

下面这些是我实际在用的。给「会报」和「不会报」的对照，比讲概念有用。

### 1. 可化简的判空后赋值

```ts
if (!a?.b?.c) { a.b.c = {} }          // 报
if (a.b.c == null) a.b.c = {}         // 报
if (typeof a.b.c === 'undefined') a.b.c = {}   // 报
if (!('c' in a.b)) a.b.c = {}         // 报
if (flag) this.x = 1                  // 不报：条件不是存在性判断
if (!a.b) { a.b = {}; log() }         // 不报：if 体有多条语句
```

判定三段：路径正则命中 → 从栈里找条件节点 → 分语义匹配（`=== null/undefined`、`typeof`、`!x`、`in`、`hasOwnProperty`）。

### 2. 判存后删除

上一条的镜像。比较运算符反过来（`!==` / `!=`），目标节点是 `delete` 一元表达式。

### 3. 可换成语义化函数的数组增删

```ts
if (!arr.includes(x)) { arr.push(x) }      // 报，可换 pushUnique
if (arr.indexOf(k) > -1) { arr.splice(k, 1) }  // 报，可换 removeExist
arr.push(x)                                // 不报：无前置判断
```

触发条件：`indexOf` / `includes`；目标操作：`splice` / `push` / `unshift`。判定时要比较「callee 去掉最后一段」的实体链是否相同。

### 4. 遍历中修改被遍历的数组

```ts
for (const x of arr) { arr.push(y) }   // 报，可能死循环
arr.forEach(x => other.push(x))        // 不报：操作的不是同一个数组
arr.sort()                             // 不报：方法不在黑名单
```

关键一步是算出「被遍历的数组叫什么」：`arr.length` 要去掉 `.length`，`arr.forEach` 要 shift 掉方法名，都归一到 `arr`。

### 5. 密集长链调用

三个阈值：单层链超过 5 级、行号间隔小于 3 算同一组、组内累计够 4 条才报。

**它的设计值得学**：不是「遇到就报」，而是算**局部密度** —— 把（`文件 × 行号 → 该行长链条数`）分组，再把间隔 3 行内的聚成组。这样能过滤掉零星的深链，只报真正该抽中间变量的那一坨。

### 6. 变量重名 / 遮蔽

手写作用域递归，支持 `Identifier`、`ObjectPattern`（嵌套解构）、`ArrayPattern` 三种定义形态。

**注意这是近似实现**：按 `body` 层级划分而非真正的符号表，所以 `if` 两个分支之间的同名可能漏报。要精确就得上 scope 分析，代价高一个量级。

### 7. 可用卫语句优化的巨型 if

四条约束同时满足才报：位于函数体**最后一项**、是 `IfStatement`、**没有 else**、体**超过 20 行** → 提示改成 `if (!cond) return`。

## 十、什么时候不该用 AST：一个反例

数「连续多少行注释」这个问题，我用纯文本解决的：正则匹配 `<!-- -->` 和 `/* */`，再用状态机扫连续行注释。

**不是所有检查都需要 AST。** 能读文本解决的，读文本更省。

反过来，不用 AST 的代价也很清楚。比如要统计「某个 import 进来的符号被用了几次」，如果图省事用逐行正则 `\b别名\b`，那么：

- import 语句自身会被计一次
- 注释里提到也算
- 字符串里出现也算

**这就是值得上 AST 的地方** —— AST 能区分「这是一个标识符引用」和「这是一段恰好长得像的文本」。

## 十一、一个可直接跑的模板

存成 `check-my-rule.js`，在项目根执行 `node ./check-my-rule.js`：

```js
const parser = require('@babel/parser')
const { parse } = require('@vue/compiler-sfc')
const fs = require('fs')
const path = require('path')

const path2 = (p) => p.replace(/\\/g, '/')

// 想抓的模式：if 体里（或 && 短路里）的裸赋值
const structReg = /\/(IfStatement(\/BlockStatement)?\/ExpressionStatement|ExpressionStatement\/LogicalExpression)\/AssignmentExpression$/

function getAst(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let startLine = 0

  if (filePath.endsWith('.vue')) {
    const sfc = parse(content)
    const script = sfc.descriptor.script || sfc.descriptor.scriptSetup
    if (!script) return null
    content = script.content
    startLine = script.loc.start.line - 1
  }

  const program = parser.parse(content, {
    plugins: ['typescript', 'decorators-legacy', 'jsx'],
    sourceType: 'module',
  }).program

  return { program, startLine }
}

function traverseAstNode(obj, callback) {
  if (typeof obj !== 'object' || obj === null) return
  if (obj.type) {
    const next = () => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) traverseAstNode(obj[key], callback)
      }
    }
    callback(obj, next)
  } else if (obj instanceof Array) {
    obj.forEach((o) => traverseAstNode(o, callback))
  }
}

function walk(dir, cb) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    fs.statSync(p).isDirectory() ? walk(p, cb) : cb(path2(p))
  }
}

walk('src', (filePath) => {
  const ast = getAst(filePath)
  if (!ast) return

  const pathStack = []
  traverseAstNode(ast.program, (node, next) => {
    pathStack.push(`${pathStack.at(-1) ?? ''}/${node.type}`)
    const end = () => { next(); pathStack.pop() }

    if (node.type === 'AssignmentExpression' && structReg.test(pathStack.at(-1))) {
      console.log('hit:', filePath, node.loc.start.line + ast.startLine)
    }
    return end()
  })
})
```

四个不能忘的点：

1. **任何分支都要出栈** —— `return end()` 不能漏
2. **报行号要 `+ startLine`**
3. **先做误报抑制**，否则上线第一天就被关掉
4. **`next` 是续延**，不调用就不深入子节点

## 十二、一个诚实的结论

这套东西的定位要明确：**它不是 lint**。

不修代码、不改变退出码、不进 CI，产出的是「给人看的重构候选清单」。这是我有意的 —— **一个会卡住提交的检查器，活不过第一周**。

它真正解决的问题是 ESLint 表达不出来的那一类判断。判断该不该自己造，标准就一条：

> **先确认 ESLint 的 selector 真的写不出来，再造。**

写不出来（比如需要比较两处引用的实体链），AST 是唯一解。写得出来，就用 ESLint —— 别为了造工具而造工具。
