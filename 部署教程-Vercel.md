# 部署到 Vercel（域名 youngke.cn · 阿里云 DNS · Cloudflare）

目标：`git push` 之后什么都不用管，站点自动更新；域名用自己的；邮箱用自己的域名。

---

## 一、三者怎么分工

| 组件 | 角色 | 为什么是它 |
|---|---|---|
| **Vercel** | 构建 + 源站 + 自动 HTTPS | Next.js 的亲爹，零配置，`main` 分支一推 60 秒内上线，每个 PR 自动生成预览链接 |
| **阿里云 DNS** | 主权威 DNS | ICP 备案的接入商是阿里云，域名解析留在这里最稳，出问题秒改生效（TTL 10 分钟） |
| **Cloudflare** | 域名邮箱 + 备用 DNS（默认不代理流量） | Email Routing 免费，能做出 `hi@youngke.cn`；同时保留一份备用解析用于故障切换 |

### 为什么默认不让流量过 Cloudflare

这是整个方案里最重要的取舍，先说明白：

- Vercel 官方原话：**中国大陆没有节点，无法保证可用性和性能**。`*.vercel.app` 默认域名在国内已被 DNS 污染，所以**必须绑自定义域名**
- Cloudflare 免费套餐同样没有中国大陆专职节点（合作节点只给企业版），国内访客常被调度到美国/新加坡
- 让流量多绕一层代理，在国内通常是**变慢**，不是变快

所以默认走「阿里云 DNS 直连 Vercel」，把能优化的部分（Vercel 的中国专用 CNAME）用上。
想让流量走 Cloudflare 的话，第五节给了单独的做法，可以配好之后再实测对比。

> 如果你想要国内也秒开，最省事的办法是**国内另外同步一个 EdgeOne Pages 副本**（免费、国内节点、同一个仓库 push 自动构建），仓库里已有对应的部署教程。Vercel 负责海外和预览，EdgeOne 负责国内。

---

## 二、Vercel：接入仓库

1. 打开 https://vercel.com ，**用 GitHub 账号登录**
2. Add New → Project → 导入 `yyl1208/youngke-blog`
3. 关键配置项（**不要照 Next.js 预设走，这个项目是纯静态导出**）：

| 配置项 | 值 |
|---|---|
| Framework Preset | **Other**（别选 Next.js，选了会按 SSR 模式去 `.next` 找产物） |
| Build Command | `npm run build` |
| Output Directory | **`out`**（不是 `.next`，项目是 `output: 'export'`） |
| Install Command | `npm install`（保持默认） |
| Node.js Version | 22 |

4. Environment Variables 加一条：

```
SITE_URL = https://youngke.cn
```

> 这个变量给 RSS 和页面 metadata 拼绝对地址用。不设的话 RSS 里的链接会缺域名。

5. Deploy。等一分钟左右拿到 `xxx.vercel.app`，先打开确认能正常渲染（含明暗主题切换、搜索、RSS）。

> `vercel.json` 已经在仓库里了，作用是关掉 cleanUrls、保留结尾斜杠，和 `trailingSlash: true` 的构建产物保持一致，避免 `/posts/xxx/` 被重定向两次。

---

## 三、Vercel：绑定域名

进项目 → Settings → Domains，把两个都加上（都加才不会出现根域/www 互相重定向的死循环）：

1. `youngke.cn`
2. `www.youngke.cn`

加完之后 Vercel 可能给出两条要求：

- 一条 **CNAME / A 记录**（指向源站）
- 一条 **TXT 记录**，形如 `_vercel` → `vc-domain-verify=xxxxx`（域名所有权验证）

**先把 TXT 那条记下来**，下一节要填到阿里云。此时域名状态是 `Invalid Configuration`，正常的，DNS 配完会自己变绿。

---

## 四、阿里云 DNS：写解析记录

登录阿里云 → 控制台 → **云解析 DNS / 公网权威解析** → `youngke.cn` → 解析设置。

### 记录清单

| 主机记录 | 类型 | 记录值 | 说明 |
|---|---|---|---|
| `@` | **A** | `76.76.21.21` | Vercel 的固定 IP |
| `www` | **CNAME** | `cname-china.vercel-dns.com` | Vercel 专门给中国大陆的线路 |
| `_vercel` | TXT | Vercel 给的 `vc-domain-verify=...` 值 | 所有权验证（没有就不加） |

TTL 全部填 **10 分钟**。

### 几个必须注意的点

> **① 根域只能 A 记录，不能 CNAME。**
> 阿里云免费版不支持 CNAME flattening / ALIAS。而且 CNAME 和 A 记录在同一主机记录下会冲突（报 `DomainRecordConflict`）。

> **② `www` 用 `cname-china` 而不是 `cname`。**
> `cname.vercel-dns.com` 是给全球走的；`cname-china.vercel-dns.com` 是 Vercel 针对中国大陆优化的。这一字之差是国内能不能打开的关键。

> **③ 如果 `@` 下面已经有 MX 记录**（域名邮箱会用），A 记录和 MX 不冲突，可以共存；但如果你想给 `@` 加 CNAME，就会踩冲突，别这么配。

### 验证

```bash
# 根域应该返回 76.76.21.21
dig youngke.cn A +short
# www 应该返回 cname-china 那条链
dig www.youngke.cn CNAME +short
```

生效后回到 Vercel Domains 页面点 Refresh，两个域名都变成绿色 **Valid Configuration**，证书状态会从 Provisioning 变成 Active。一般 10 分钟内全部搞定。

---

## 五、Cloudflare：域名邮箱（推荐做，免费）

做出 `hi@youngke.cn` 这种地址，放在简历和 GitHub 主页上比 QQ 邮箱强一截，而且完全免费。

1. 注册 https://dash.cloudflare.com → Add a Site → 输入 `youngke.cn` → 选 **Free** 计划
2. 它会提示你去注册商改 NS。**先不要改**，我们要保留阿里云 DNS 作为权威 DNS
3. 进入站点 → **Email** → Email Routing → Create address：
   - Custom address: `hi`
   - Destination: `1115383145@qq.com`
4. CF 会列出需要添加的 DNS 记录（几条 MX + 一条 SPF 的 TXT）。把这些记录**手动加到阿里云 DNS**（不是 Cloudflare，因为权威 DNS 在阿里云）：

| 主机记录 | 类型 | 记录值 | 优先级 |
|---|---|---|---|
| `@` | MX | `route1.mx.cloudflare.net` | 58 |
| `@` | MX | `route2.mx.cloudflare.net` | 34 |
| `@` | MX | `route3.mx.cloudflare.net` | 58 |
| `@` | TXT | CF 给的 `v=spf1 include:_spf.mx.cloudflare.net ~all` | — |

5. 回到 CF 点 Verify，通过之后 `hi@youngke.cn` 收到的邮件会自动转到你 QQ 邮箱

> MX 记录和 A 记录在同一主机记录下不冲突，放心加。

### 顺手把备用 DNS 也建好

CF 里这个 zone 现在处于 Pending 状态，正好当成免费备胎：把阿里云那套记录（`@` A、`www` CNAME）在 CF 里同样填一遍。
万一阿里云 DNS 出问题，去阿里云万网控制台把 NS 改成 CF 给的两个地址，十几分钟切过去。

---

## 六、可选：让流量经过 Cloudflare

如果你想用 CF 的缓存 / WAF / 统计，可以用**子域 NS 委派**——只把 `www` 的解析权交给 CF，根域和邮箱继续留在阿里云。

1. 阿里云 DNS 加一条：主机记录 `www`，类型 **NS**，记录值填 CF 给你的两个 NS（如 `xxx.ns.cloudflare.com`）
2. CF 里加记录：`www` → CNAME → `cname.vercel-dns.com`
3. **SSL/TLS 加密模式必须选 `Full`** 选 Flexible 会导致重定向死循环
4. 建议先用「仅 DNS（灰云）」让 Vercel 的域名验证通过（两个绿勾），再打开橙色云的代理开关

> 打开之后务必用 https://www.itdog.cn/http/ 这类工具做多地拨测。如果国内延迟反而变高，把橙色云关掉即可，不需要动其他配置。

---

## 七、验收清单

按顺序过一遍，全绿才算完：

- [ ] `https://youngke.cn` 打开正常，17 个页面全部 200
- [ ] `https://www.youngke.cn` 打开正常
- [ ] HTTPS 证书有效（浏览器显示安全锁）
- [ ] 右上主题切换正常，刷新不闪白
- [ ] ⌘K 搜索能搜到文章和知识库
- [ ] `https://youngke.cn/rss.xml` 能打开，里面链接的域名是 `youngke.cn`
- [ ] 手机上看：导航收成汉堡菜单，展开正常
- [ ] `hi@youngke.cn` 收到测试邮件
- [ ] 国内多地测速（itdog）延迟可接受
- [ ] 在 Vercel 推送一个小改动，确认自动重新部署

---

## 八、常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 部署完打开白屏 / 404 | Output Directory 填了 `.next` 或没填 | 改成 `out` |
| Vercel 一直 Invalid Configuration | DNS 没生效或漏了 TXT | `dig` 核对；云解析 DNS 里 TTL 设 10 分钟并等够时间 |
| 证书一直 Provisioning | DNS 未传播完成 | 等 10 分钟；超过一小时检查 A/CNAME 是否写对 |
| 国内打不开 | 用了 `cname.vercel-dns.com` | 换成 `cname-china.vercel-dns.com` |
| 开了 CF 橙云后无限重定向 | SSL 模式是 Flexible | 改成 **Full** |
| 根域想加 CNAME 报冲突 | A 记录还在 | 删掉 A 记录再添加；或根域保持 A 记录 |
| `@` 下加了 CNAME 之后邮箱时好时坏 | CNAME 优先级高于 MX | 根域改用 A 记录指向 76.76.21.21 |
| 页面互相重定向不停 | 根域和 www 只绑了一个 | 两个都加到 Vercel Domains |

---

## 九、两条额外提醒

**关于备案。** 域名已经在阿里云完成 ICP 备案。把它解析到境外服务器（Vercel）本身不违规，**但**阿里云作为接入商会做「备案接入检测」，可能把这个域名标记为未接入、甚至取消接入。如果出现这种情况，最简单的处置是：国内另挂一份 EdgeOne Pages（仓库里已有教程），Vercel 作为海外入口，两边用同一个仓库同一份代码。

**关于 Vercel 免费套餐的用途限制。** Hobby 计划的条款里明确写了**禁止商业用途**。个人博客、技术作品集属于个人非商业使用，没问题；但如果以后放了广告、付费服务或商业引流内容，需要升级到 Pro。流量方面个人博客远远打不到上限，不用管。
