---
title: 反射和依赖注入
domain: 后端相关
project: 通用
date: 2026-09-20
tags: [java, 反射, 依赖注入, spring]
summary: 写了两年 Java，@Autowired 一直是黑盒。把反射和注入这两件事拆开看，才发现它们不是一个层级的东西：一个是语言能力，一个是设计选择。
---

## 问题

虽然我毕业刚开始找的工作是Java，但是工作后一直干的前端:)

后来有机会又干回了Java

在我转后端最开始，刚接手项目时

我问了我同事一个比较弱智的问题

怎么一个类里的私有对象  没有new，也没有输入  怎么就直接能在下面的函数里用上了呢，和js不太一样啊

同事回了一句：依赖注入

我挠头 很显然java原理都忘光了

场景如下：

```java
@Service
public class OrderService {
    @Autowired
    private UserClient userClient;

    // 没有 new，没有 setter，字段还是 private
    // 但下面这个方法里它就是有值
    public Order createOrder(Long userId) {
        UserDTO user = userClient.findById(userId);
        return new Order(user);
    }
}
```

前端写久了会本能地找"赋值"这两个字。这里没有赋值，只有一个注解。

## 结论

注解背后是两件事：**反射是 Java 的语言能力，依赖注入是一个设计选择。** 前者是手段，后者是目的。

### 一、@Autowired 替你做了三步

Spring 启动时干的事，拆开看就三步，每一步都要反射：

1. **找到有哪些类要管**。扫 classpath，读类上的 `@Service` / `@Component`——读注解本身就是反射（`getAnnotation`）。
2. **把对象造出来**。类只是个名字，Spring 拿着 `Class` 对象找到构造器，反射调用它。
3. **把依赖塞进去**。找带 `@Autowired` 的字段，反射赋值：

```java
Field f = clazz.getDeclaredField("userClient");
f.setAccessible(true);
f.set(instance, userClientInstance);
```

Spring 里干第 3 步的是 `AutowiredAnnotationBeanPostProcessor`，它在 bean 初始化阶段扫描带注解的字段和方法，然后走上面这三行。

**所以"没有 setter 也能注入"不是 Spring 有什么特权，是 Java 本来就允许运行时改私有字段。**

### 二、@Autowired / @Resource / @RequiredArgsConstructor

三种写法都能让那个字段"莫名其妙有值"，但它们不是一类东西：

```java
// 1. Spring 自己的注解，按类型注入
@Service
public class OrderService {
    @Autowired
    private UserClient userClient;
}

// 2. JSR-250 的标准注解，不是 Spring 的：先按名字，找不到再按类型
@Service
public class OrderService {
    @Resource
    private UserClient userClient;
}

// 3. Lombok 的注解，编译期生成构造器，它自己不做任何注入
@Service
@RequiredArgsConstructor
public class OrderService {
    private final UserClient userClient;
}
```

**第三个跟前两个不在一层。** `@RequiredArgsConstructor` 不注入任何东西，它只在编译期帮你把构造器写出来——等价于手写：

```java
public OrderService(UserClient userClient) {
    this.userClient = userClient;
}
```

Spring 4.3 之后，类里只有一个构造器时会自动拿它来注入，连 `@Autowired` 都不用写。所以它看着像注入，实际是**构造器注入的语法糖**。

| | @Autowired | @Resource | @RequiredArgsConstructor |
| --- | --- | --- | --- |
| 出处 | Spring 自带 | JSR-250（JDK 8 自带，JDK 11 起要额外引依赖） | Lombok，编译期 |
| 匹配方式 | 按类型，多个同类型要配 `@Qualifier` / `@Primary` | 先按名字（字段名），找不到再按类型 | 按类型，走构造器 |
| 字段能 final | 不能 | 不能 | 必须 final，否则不进构造器 |
| 循环依赖 | 被三级缓存兜住，能启动 | 同左 | 启动直接报错 |
| 单测 | 要起容器或反射塞值 | 同左 | `new` 一下就行 |

（后面三行的原因见第五节。）

各自的坑：

- **@Autowired 按类型**：同一个接口有两个实现，启动就炸，得补 `@Qualifier("xxx")` 或者给其中一个标 `@Primary`。
- **@Resource 按名字**：字段名就是匹配依据。**改个字段名可能换掉注入的对象，或者直接注入失败**——这种失败跟代码逻辑无关，排查时很容易往别的方向想。
- **@RequiredArgsConstructor 的字段必须是 final**（或者标 `@NonNull`）。忘了加 final，它就不进构造器，运行起来是 null，**编译期一点提示都没有**。
- **Lombok 本身有成本**：IDE 要装插件，JDK 升级时 Lombok 版本得跟上，否则编译挂；团队里有人没装插件就会看到一片红线。
- **ps：注解没加，就是 null。** 我就修过别人一个 bug——`@Autowired` 忘了写，字段从头到尾没被注入，用到的时候直接 null。麻烦的地方在于编译和启动都不报错，只有跑到那行才知道。

我的选择：默认用 `@RequiredArgsConstructor` 走构造器；一个类型有多个实现、想按名字挑的时候用 `@Resource`；`@Autowired` 字段注入能不写就不写。

### 三、反射：凭什么改得动 private

反射的字面意思就是程序转过来看自己。类、字段、方法、构造器，在运行时都是 JVM 里的对象：

```java
Field f = OrderService.class.getDeclaredField("userClient");   // private 也拿得到
f.setAccessible(true);                                          // 这次访问别做检查
f.set(service, someClient);                                     // 改掉了
```

`private` 不是安全机制，是设计意图——它在说"这个字段的修改应该走我提供的方法"。`setAccessible(true)` 一开，这个约定就失效了。

三条代价要知道：

- **慢。** 要走访问检查、参数装箱成 `Object[]`、JIT 难内联。装配期（启动、创建对象）用没问题，放在每秒跑几万次的循环里就是开销。
- **绕过封装。** 改了不走校验、不触发通知，谁都不知道。
- **JDK 9 之后不是万能钥匙。** 跨模块反射一个没有 `opens` 的包，`setAccessible(true)` 直接抛 `InaccessibleObjectException`。报错长得像权限问题，实际是模块没开放。

### 四、依赖注入解决的是"谁去找依赖"

把反射放一边，先说注入本身。

不用注入的写法是自己 new：

```java
public class OrderService {
    private final UserClient userClient = new UserClient();
}
```

问题不在 `new`，在于 **OrderService 从此知道 UserClient 怎么构造**。而 UserClient 自己还有依赖（HttpClient、baseUrl……），于是一条链就出来了：每个类都在替它的依赖做决定，改一个底层实现，上面的全得动。

注入的思路是把决定权交出去：

```java
public class OrderService {
    private final UserClient userClient;

    public OrderService(UserClient userClient) {   // 我要什么，说清楚
        this.userClient = userClient;              // 谁给的，我不管
    }
}
```

类只声明"我需要什么"，谁负责送进来是别人的事。这就是控制反转：不是"我去拿"，而是"有人给我"。

好处很具体：想换个实现（测试时换假的），OrderService 一行都不用改。前端类比一下就是 props——组件不自己造数据，数据从外面传进来。

### 五、为什么现在都推荐构造器注入（@RequiredArgsConstructor）

先把一个容易混的点说清楚：**构造器注入是"做法"，`@RequiredArgsConstructor` 只是省手写的写法之一。**
`@Autowired` 标在构造器上同样是构造器注入，跟 Lombok 生成出来的那个构造器是一回事。真正对立的是**字段注入和构造器注入**，不是这两个注解。

`@Autowired` 做构造器注入，就是把注解标在构造器上：

```java
@Service
public class OrderService {
    private final UserClient userClient;
    private final SmsClient smsClient;

    @Autowired                                   // 标在构造器上，不是字段上
    public OrderService(UserClient userClient, SmsClient smsClient) {
        this.userClient = userClient;
        this.smsClient = smsClient;
    }
}
```

Spring 做的事：发现构造器有参数 → 按参数类型去容器里找 bean → 反射调用这个构造器。**全程不碰字段**，所以 private 不需要 `setAccessible`，也不存在"先造个半成品再塞值"那一步。

两个边界：

1. **类里只有一个构造器时，这个 `@Autowired` 可以省**——Spring 4.3 起自动拿它注入，上面那段去掉注解完全能用。
2. **有多个构造器且都不标注解时，Spring 会去找无参构造器**——找到了就用它（依赖反而不注入），找不到就启动报错。所以多构造器场景要在你想用的那个上标一个 `@Autowired`。

顺带一个隐性保险：字段写成 final 之后，无参构造器编译都过不去（final 必须初始化），不会悄悄走到"依赖没注入"那条路上。

所以对照着看就很清楚——**同一个注解，标的位置决定它是哪种注入**：

```java
@Autowired private UserClient userClient;              // 字段注入
@Autowired public OrderService(UserClient c) { ... }   // 构造器注入
```

四条，都能验证：

1. **字段能写成 final。** 字段注入的字段不能是 final——对象是先造出来、之后才被塞值的。final 意味着构造完成那一刻状态就定了。
2. **不会拿到"半个对象"。** 字段注入时对象先被 new 出来，那一刻依赖还是 null。这中间有别的代码用到它（`@PostConstruct` 里、初始化方法里）就是 NPE，而且跟启动顺序有关，时有时无。
3. **循环依赖当场暴露。** Spring 对字段注入的循环依赖有兜底（三级缓存，先把半成品引用暴露出去让对方用着），所以能启动成功。构造器注入绕不过去，启动直接报 `BeanCurrentlyInCreationException`。
   这一条常被当成构造器注入的缺点，我反过来想：**循环依赖本身是设计问题，能启动不代表没问题**，它只是把问题从"启动失败"变成了"某个时刻行为诡异"。
4. **单测不用起容器。** 构造器注入的测试就是 `new OrderService(new FakeUserClient())`。字段注入要么起 Spring 容器（慢），要么用反射自己塞值（脆，改个字段名测试就挂）。

四条里我最在意第 2 条：只有它是"能启动但会随机出错"，这类问题最难查。

### 六、如果面试被问到：讲一下 Java 的反射 / 依赖注入

被问"讲一下反射和依赖注入"，按这个顺序说，不容易散：

**第一步，各一句话定性。** 反射是运行时读类信息的能力——类、字段、方法、构造器在 JVM 里都是对象，能枚举、能调用。依赖注入是"谁负责找依赖"的设计选择——类只声明需要什么，由外部送进来。

**第二步，说清楚两者什么关系。** 注入是目的，反射是实现它的手段之一。Spring 用反射扫注解、调构造器、塞字段。**它们是两件事，不是一个东西的两面。**

**第三步，举一个具体的点证明你真的看过。** 比如：private 字段没有 setter 也能注入，不是 Spring 有特权，是 Java 允许运行时改私有字段——`Field.setAccessible(true)` 之后 `set` 进去，干这活的是 `AutowiredAnnotationBeanPostProcessor`。

**第四步，给主张。** 我倾向构造器注入：字段能 final、没有半初始化状态、循环依赖启动就暴露、单测不用起容器。

追问大概率落在这几个点上：

- **反射有什么代价？** 性能（热路径别用）、绕过封装、JDK 9 之后受模块系统限制（没 `opens` 就 `InaccessibleObjectException`）。
- **@Autowired 和 @Resource 有什么区别？** 前者按类型，后者先按名字（字段名）再按类型。见第二节。
- **循环依赖怎么办？** 字段注入被 Spring 三级缓存兜住、能启动；构造器注入启动就报错。我的看法是后者更好——问题暴露在启动期，而不是运行期的某个时刻。
- **为什么字段不能是 final？** 因为字段注入是对象造出来之后才塞值的，final 要求构造期就定下来。

讲的时候别一上来背 API。`getDeclaredField`、`setAccessible` 这些名字顺口带一句就行，**重点是"注解不做事，框架读注解做事"这句**——它说明你理解的是机制，不是语法。

### 七、换成 TypeScript：装饰器不是注解

既然是从前端转回来的，最后补一层对比。两边都叫"注解 / 装饰器"，但它俩不是一回事。

**Java 的注解是标签，TS 的装饰器是函数。**

```java
@Autowired
private UserClient userClient;
```

这段注解不执行任何代码。它只是往字段上贴了个标签，谁去读、读了要做什么，跟它自己无关。

```typescript
@Service
class OrderService {}
```

TS 里这个 `@Service` 是一个**真的会被调用的函数**。编译之后：

```javascript
OrderService = __decorate([Service], OrderService);
```

等价于 `Service(OrderService)`。类定义完成的那一刻它就跑了，可以改类、改原型、把自己注册进某个容器。

（这里说的是 `experimentalDecorators` 那套，Angular、NestJS 目前用的也是它；TS 5.0 之后还有一套新的标准装饰器，签名不一样。）

所以：

| | Java 注解 | TS 装饰器 |
| --- | --- | --- |
| 本质 | 元数据，不执行 | 函数，定义时就被调用 |
| 谁让它生效 | 编译器 / 注解处理器 / 框架反射 | 它自己 |
| 运行时能拿到类型信息吗 | 能，字节码里还在 | 不能，编译后类型被擦除 |
| 想做 DI 还缺什么 | 缺读注解的框架（Spring） | 缺类型元数据（`emitDecoratorMetadata`） |

**但 TS 想做依赖注入，得先补一个洞：类型擦除。**

Java 能在运行时读到"这个构造器第二个参数是什么类型"，因为类型信息在字节码里还在。TS 编译成 JS 之后类型全没了，运行时拿不到参数类型，自然不知道该注入什么。

Angular / NestJS 的补法是打开一个编译选项：

```json
{ "compilerOptions": { "emitDecoratorMetadata": true } }
```

打开后 TS 会在产物里额外塞一段类型元数据（配合 `reflect-metadata`），装饰器这才读得到构造参数的类型。

**到这一步两边就长得一样了**：都是"运行时拿到类型 → 按类型找依赖 → 塞进去"。区别只在类型信息从哪来——Java 是语言自带的（反射），TS 是编译期额外生成的补丁。

顺带补一个 Java 侧的细节：**注解保留到什么时候，由 `@Retention` 决定**。

- `@RequiredArgsConstructor`（Lombok）是 `SOURCE`——编译完就没了，它只在编译期改语法树。
- `@Autowired` 是 `RUNTIME`——得留到运行时让 Spring 反射读。

同一个"注解"，保留策略不同，起作用的时机完全不同。这也解释了第二节那个问题：为什么 Lombok 那个看着像注入、其实不是——**它压根没活到运行时。**

