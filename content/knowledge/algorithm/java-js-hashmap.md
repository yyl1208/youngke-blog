---
title: Java HashMap 与 JavaScript Map：哈希、冲突和扩容是怎么回事
domain: 算法
project: 通用
date: 2026-09-30
tags: [算法, 数据结构, Java, JavaScript, HashMap]
summary: 从一次键值查找出发，拆解 Java HashMap 的桶、链表、红黑树与扩容，再对照 JavaScript Map 的相等规则、V8 有序哈希表及 Object 的区别。
---

写 Java 时用 `HashMap`，写 JavaScript 时用 `Map`，它们都能按 key 找 value，但底层并不是同一份实现。

本文的 Java 部分以 **OpenJDK 21** 为例；JavaScript 先讲语言规定的行为，再以 **V8 的 OrderedHashMap** 解释一种实现。引擎细节可能随版本变化。

## 一、哈希表为什么查得快

假设有一万名用户，要通过用户编号找姓名。逐个扫描数组，需要不断比较编号；哈希表先对编号计算一个哈希值，再把它映射到数组中的一个位置，这个位置叫“桶”。

```text
key → 哈希值 → 桶下标 → 在桶里确认 key → value

桶数组
0  → 空
1  → [用户 A, 姓名] → [用户 B, 姓名]
2  → [用户 C, 姓名]
3  → 空
```

哈希值的取值空间和桶的数量不同，两个 key 完全可能进入同一个桶，这叫**哈希冲突**。上图中 A、B 就发生了冲突，但它们仍是两条不同记录。

因此查找有两步：**哈希负责缩小范围，相等判断负责确认身份。** 哈希相同，不能直接当成同一个 key。

当分布比较均匀、桶没有太拥挤时，查找只需检查少量记录，期望时间可以接近 O(1)。这是有条件的性能结论，不代表任何输入、任何一次操作都耗时相同。

## 二、Java HashMap：先定位桶，再处理冲突

### 1. hashCode 之后为什么还要扰动

OpenJDK 的实现会把 `hashCode()` 的高 16 位混入低位，再用桶数量减一与哈希值做按位与。下面是对应的核心计算方式：

```java
int h = key.hashCode();
int hash = h ^ (h >>> 16);
int index = (capacity - 1) & hash;
```

桶数量保持为 2 的幂。假设有 16 个桶，掩码就是二进制 `1111`，下标只取决于低四位；高位参与混合后，可以缓解某些 key 低位过于相似造成的扎堆。它不能消除所有冲突。

`null` key 会单独处理，使用哈希值 0，不会调用它的 `hashCode()`。

### 2. put 和 get 怎么走

`put(key, value)` 的基本路径是：

1. 必要时初始化桶数组，计算哈希和下标。
2. 桶为空就放入新节点。
3. 桶非空就检查节点：哈希匹配后，再检查引用相同或 `equals()` 相等。
4. 找到已有 key 就更新 value，否则添加新节点。
5. 新增映射后检查是否需要扩容。

`get(key)` 也先定位桶，然后沿链表或树查找。更新已有 key 的 value 不增加 `size`。

### 3. 链表为什么会变成红黑树

普通桶通过链表连接冲突节点；链太长时，查找会越来越像遍历数组。树化用于缓解这种情况，但树节点占用更多空间，所以不会一开始就全部用树。

这里最容易把三个数字背错：

| 常量 | 含义 |
|---|---|
| 8 | 树化判定阈值；还要结合具体插入路径理解 |
| 64 | 桶数组小于这个容量时，树化请求会优先触发扩容 |
| 6 | 扩容拆分树桶时，较小分组退化为链表使用的阈值 |

以普通 `put` 的链表插入路径为例，**已有 8 个节点，再追加第 9 个节点时才会请求树化**，还需满足容量条件。不要把常量 8 理解成“第 8 个元素放进去必然变树”。删除时的退化还涉及树形判断，也不是统一的“剩 6 个就退化”。

红黑树能改善碰撞下的性能，但也不能无条件承诺所有 key 的查询最坏都是 O(log n)：大量哈希相同、又无法通过比较顺序区分的 key，仍可能需要搜索多个分支。

以上桶结构、判断路径和常量可对照 [OpenJDK 21 HashMap 源码中的 hash、putVal、treeifyBin 与 TreeNode](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/HashMap.java)。

## 三、Java 扩容：为什么节点只会去两个位置

默认负载因子为 0.75。正常情况下，16 个桶对应阈值 12，新增第 13 条不同 key 的映射会触发扩容。这里计算的是映射总数，不是非空桶数量。

容量从 16 翻到 32，下标掩码从 `01111` 变为 `11111`，只多检查一位。所以原桶里的节点只可能：

- 留在原下标；
- 移到“原下标 + 旧容量”。

举个数字例子，假定扰动后的哈希值分别是 5 和 21：

```text
容量 16： 5 & 15 = 5，21 & 15 = 5 → 都在桶 5
容量 32： 5 & 31 = 5，21 & 31 = 21 → 分到桶 5 和桶 21
```

实现可以使用节点已经保存的哈希值拆分桶，不需要重新调用每个 key 的 `hashCode()`。扩容仍需搬迁记录，是一次较昂贵的操作；讨论连续插入时通常用“摊还成本”。具体过程见 [OpenJDK 21 的 resize 方法](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/HashMap.java)。

### 自定义 key 最重要的约定

`equals()` 相等的对象必须有相同的 `hashCode()`，反过来不成立。覆盖 `equals()` 时应配套覆盖 `hashCode()`。

还要避免修改 key 中参与这两个方法的字段：放入时按旧哈希定位，修改后查询却按新哈希找桶，就可能出现“记录还在，但查不到”。这是为什么不可变 key 更容易正确使用。

例如 Java 的 record 可以表达按字段值相等的 key：

```java
import java.util.HashMap;
import java.util.Map;

record UserKey(long id) {}

class Demo {
    public static void main(String[] args) {
        Map<UserKey, String> users = new HashMap<>();
        users.put(new UserKey(7), "小明");
        System.out.println(users.get(new UserKey(7))); // 小明
    }
}
```

这里两个对象不是同一个引用，但 record 生成的相等和哈希逻辑使用字段值。约定可查看 [Object.hashCode 的官方说明](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode())。

## 四、JavaScript Map：先分清规范与实现

JavaScript 的内置集合叫 `Map`，没有一个内置类叫 `HashMap`。

ECMAScript 要求 Map 的平均访问时间随元素数量增长呈**次线性**，没有强制规定必须使用哈希表，更没有规定采用 Java 的红黑树机制。规范中的抽象算法也不能直接当成引擎的真实存储代码。[ECMAScript Map 规范](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)

### 1. key 如何判定相同

Map 的 key 可以是任意 JavaScript 值。其可观察的相等语义对应 SameValueZero：

- `NaN` 与 `NaN` 被视为相同 key；
- `+0` 与 `-0` 是同一个 key；
- 对象按身份比较，不递归比较属性；
- 数字 `1` 与字符串 `"1"` 是不同 key。

```javascript
const users = new Map();
const user = { id: 7 };

users.set(user, "小明");
console.log(users.get(user));      // 小明
console.log(users.get({ id: 7 })); // undefined：另一个对象

user.id = 8;
console.log(users.get(user));      // 小明：对象身份没有变化

users.set(NaN, "第一次");
users.set(NaN, "第二次");
console.log(users.get(NaN));       // 第二次
```

Java 可以通过 `equals/hashCode` 定义值相等；JavaScript Map 没有开放同样的自定义接口。若希望按用户编号查询，应直接把稳定的 `id` 当 key，而不是每次新建 `{ id }`。参见 [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero)。

### 2. 为什么遍历顺序和插入顺序一致

这是 Map 的语言行为：更新已有 key 不改变位置，删除后重新插入则排到后面。

```javascript
const scores = new Map([["A", 1], ["B", 2]]);
scores.set("A", 3);
console.log([...scores.keys()]); // ["A", "B"]

scores.delete("A");
scores.set("A", 4);
console.log([...scores.keys()]); // ["B", "A"]
```

上述行为由 [Map.prototype.set](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.prototype.set) 的更新与追加规则决定。Java HashMap 不承诺这种遍历顺序；Java 中需要插入顺序时通常考虑 LinkedHashMap。

## 五、V8 如何同时完成哈希查找和有序遍历

V8 的 OrderedHashMap 把**定位桶的索引区**和**保存记录的数据区**结合起来。记录中还带有同桶下一条记录的索引，用来处理冲突。下面是假设 A、C 落在同一个桶的示意，不是实际内存转储：

```text
桶索引区                         数据区（按插入先后）
桶 0 → 记录 2                    记录 0：[A, 值, 下一条 -1]
桶 1 → 记录 1                    记录 1：[B, 值, 下一条 -1]
                                 记录 2：[C, 值, 下一条  0]

查找 A：桶 0 → 记录 2 → 记录 0
遍历：记录 0 → 记录 1 → 记录 2
```

查找沿桶内索引链走；遍历沿数据区的记录顺序走。因此，同桶冲突链的顺序不必等于整体插入顺序，也不需要照搬 Java HashMap 的树化方案。结构见 [V8 ordered-hash-table.h 的布局说明](https://github.com/v8/v8/blob/main/src/objects/ordered-hash-table.h)。

删除记录会留下删除标记，遍历时跳过。插入需要更多空间时，实现会根据有效记录和已删除记录的占用情况，选择扩大容量，或者重新整理同等容量的表来清除空洞。重新整理时还要维护存活记录的相对顺序。[V8 OrderedHashTable 的 EnsureCapacityForAdding、Delete 与 Rehash](https://github.com/v8/v8/blob/main/src/objects/ordered-hash-table.cc)

对象 key 的哈希由引擎管理，不能简单理解成“拿对象内存地址取模”。JavaScript 对象可能被垃圾回收器移动，但 Map 仍需保持对象身份一致。V8 的相关实现背景可参考 [哈希码存储优化说明](https://v8.dev/blog/hash-code)。

## 六、普通 Object 能不能当 Map 用

可以表达某些字典，但语义不同：普通对象的属性键是字符串或 Symbol。数字会转成字符串，普通对象作为属性键也会发生转换。

```javascript
const dict = {};
dict[1] = "数字";
dict["1"] = "字符串";
console.log(dict[1]); // 字符串：同一个属性

const map = new Map();
map.set(1, "数字");
map.set("1", "字符串");
console.log(map.size); // 2
```

也不能把 Object 统一理解为“底层就是哈希表”。V8 会使用隐藏类和快速属性等机制，也存在字典属性存储；具体表示取决于对象的使用方式。这里的隐藏类在 V8 内部也叫 Map，但与 JavaScript 的 `new Map()` 不是同一个概念。[V8 Fast properties](https://v8.dev/blog/fast-properties)

业务数据的固定字段适合对象；动态增删的键值集合、对象 key、需要直接获取元素数量的场景，Map 通常更符合表达意图。

## 七、放在一起记

| 对比项 | Java HashMap | JavaScript Map |
|---|---|---|
| 相等判断 | 引用相同或 equals 相等，配合 hashCode | SameValueZero 语义，对象按身份 |
| 实现讨论范围 | 本文以 OpenJDK 21 为例 | 规范不限定；本文以 V8 为例 |
| 冲突处理 | 链表，满足条件可树化 | V8 OrderedHashMap 使用桶内索引链 |
| 遍历顺序 | 不保证 | 保持插入顺序 |
| 特殊 key | 允许 null | 允许 null、undefined、NaN 等 |
| 查询没找到 | get 返回 null | get 返回 undefined |

如果值本身就允许 `null` 或 `undefined`，仅看 `get` 的返回值无法判断 key 是否存在：Java 用 `containsKey`，JavaScript 用 `has`。

回答实现原理时，可以沿着一条线讲清楚：**key 怎么判等 → 哈希怎么定位 → 冲突怎么处理 → 空间不足怎么扩容 → 遍历顺序如何保证。** 这样比只背“数组、链表、红黑树”更容易解释两种语言的差异。
