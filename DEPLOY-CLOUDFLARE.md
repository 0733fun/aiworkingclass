# Cloudflare Pages 部署与 AI 抓取核对清单

域名：**0733.fun**
目标：站点上线，且**所有主流 AI 爬虫都能完整抓取**

> ⚠️ **先说时间敏感点**
> Cloudflare 的 AI 流量新默认策略在 **2026 年 9 月 15 日** 生效。
> 在此之后新接入网络的域名会自动获得：Search 类放行、**Agent 类与 Training 类在有广告的页面上默认拦截**。
> 本站没有广告，大概率不在拦截范围内 —— 但仍必须亲自核对，不能假设。
> 另外「多用途爬虫按最严规则处理」意味着 **Googlebot / Applebot / Bingbot 可能被 Training 拦截误伤**，这是最致命的误操作。

---

## 前置条件

| 项 | 状态 |
| --- | --- |
| 域名 `0733.fun` | 已注册 |
| Cloudflare 账号 | dash.cloudflare.com 免费注册 |
| Node.js ≥ 20 | `node --version` 检查 |
| Git（可选） | **未安装也能部署**，用 Direct Upload 路径，见阶段 2B |

---

# 阶段 1：本地构建验证

```bash
cd 0733-fun
npm install
npm run build
npm run check:local
```

`check:local` 必须 **0 失败** 才继续。它检查的是 robots.txt 是否放行、404.html 是否存在、正文是否真的在 HTML 源码里、canonical 与 JSON-LD 是否齐全。

想先看效果：

```bash
npm run dev     # http://localhost:4321
```

---

# 阶段 2：把代码放到云端

## 2A. 走 Git（推荐，之后改文章自动重新部署）

先装 Git for Windows：<https://git-scm.com/download/win>

```bash
git init
git add .
git commit -m "初始提交：0733.fun 站点"
git branch -M main
git remote add origin https://github.com/<你的用户名>/0733-fun.git
git push -u origin main
```

`.gitignore` 已经配好，`dist/`、`node_modules/`、`.astro/` 都不会被提交。

## 2B. 不走 Git（Direct Upload）

无需安装 Git，用 Wrangler 直接把构建产物传上去：

```bash
npm install -D wrangler
npx wrangler login
npx wrangler pages project create 0733-fun
npx wrangler pages deploy dist --project-name=0733-fun
```

代价：**每次改完文章都要手动重新构建并上传**，没有自动部署。

---

# 阶段 3：创建 Pages 项目

> 走 2B 的可以跳过本阶段。

1. 打开 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选中 `0733-fun` 仓库
3. 构建配置：

| 字段 | 值 |
| --- | --- |
| Framework preset | **Astro** |
| Build command | `npm run build` |
| Build output directory | `dist` |

4. **环境变量**（Production 与 Preview 都加上）：

| 变量名 | 值 |
| --- | --- |
| `NODE_VERSION` | `22` |

5. **Save and Deploy**

部署完成后会得到一个 `0733-fun.pages.dev` 地址。**先在这个地址上把阶段 6 的验证跑通，再接自定义域名** —— 出问题时容易定位是站点的问题还是域名的问题。

---

# 阶段 4：接入域名（这一步不能省）

## ⚠️ 为什么必须做成 Cloudflare zone

Cloudflare 的 `robots.txt` 托管、AI Crawl Control、WAF **全都是 zone 级功能**。而按官方文档：

> 要把 Pages 项目部署到**根域名**（`0733.fun`），该自定义域**必须是**你创建 Pages 项目那个 Cloudflare 账号上的一个 zone。

只走外部 DNS 的 CNAME 到 `pages.dev` 也能打开网站，但**你的域名不在 Cloudflare zone 里，zone 级的 AI 控制台就看不到、也管不了**。

## 操作

1. Dashboard → **Add a site** → 输入 `0733.fun` → 选 **Free** 计划
2. 到域名注册商处，把 **NS 改成 Cloudflare 给的两个地址**
3. 等待生效（通常几分钟到几小时，最长 24 小时），状态变为 **Active**
4. 回到 **Workers & Pages** → 你的项目 → **Custom domains** → **Set up a domain** → 填 `0733.fun`

因为是你的 zone，Cloudflare 会自动创建 CNAME 记录并签发证书。

**两个坑：**

- **不要手动**加 CNAME 指向 `pages.dev` 而跳过上面的流程 —— 会直接导致解析失败和 522 错误。
- 如果你的域名有 **CAA 记录**，必须允许 Cloudflare 签发证书，否则证书签发会失败。

**顺带做两件事：**

- 在注册商处开启**域名锁（Registrar Lock）+ 自动续费**。域名过期是个人站最常见的死法。
- 处理 `www`：加一条 **Rules → Redirect Rules**，条件 `http.host eq "www.0733.fun"`，301 跳转到 `https://0733.fun` + 原路径。不做也行 —— 站点的 canonical 标签已经统一指向 `0733.fun`，只是多一次跳转体验更好。

---

# 阶段 5：⚠️ 关闭所有会拦 AI 的设置

**这是整件事的核心。** 逐项核对，下表是本站需要的值：

| 位置 | 设置项 | 本站要求 | 原因 |
| --- | --- | --- | --- |
| Security → **Settings** → Bot traffic | **Set your preference to block training in robots.txt** | **关闭** ❌ | **最重要**。开启后 Cloudflare 会在你的 robots.txt **前面插入**它自己的一段，明确 `Disallow: /` 掉 **GPTBot、ClaudeBot、Google-Extended、Bytespider、CCBot、Applebot-Extended、Amazonbot、meta-externalagent**。对本站目标来说正好全反了 |
| Security → **Bots** | **Bot Fight Mode** | **关闭** ❌ | 免费版的它会对"疑似自动流量"下发 JS 挑战，会误伤 AI 爬虫 |
| Security → **Bots** | **AI Labyrinth** | **关闭** ❌ | 原理是给爬虫喂诱饵链接，与本站目标相反 |
| Zone **Overview** → Control AI Crawlers | 一键拦截 AI 爬虫 | **保持放行** ✅ | 不能开 |
| Zone **Overview** → Control AI Crawlers | Display Content Signals Policy | 任意 | 只是注释文本，无实际影响；本站自带 robots.txt，不受影响 |
| **AI Crawl Control** → Crawlers | 每个爬虫的 Action | 全部 **Allow** ✅ | 见下方 |
| Security → **Settings** | **Under Attack Mode** | 关闭 ❌ | 会对外返回挑战页 |
| Security → **Settings** | **Security Level** | 不要设 High ❌ | Medium / Off |
| Security → **WAF** → Custom rules | 任何含 AI bot 或 bot score 的规则 | 逐条审 ❌ | 拦截最终都落在这里 |
| Zero Trust / **Access** | 不要给正文页加 Access 策略 | — | 登录墙 = AI 读不到 |

## 关于 AI Crawl Control

官方文档确认 **"Available on all plans"**，自动生效，无需配置。入口：

**Dashboard → AI Crawl Control**（直达 `dash.cloudflare.com/?to=/:account/:zone/ai`）

- **Overview** —— 看哪些 AI 爬虫在访问、最热路径、引荐流量
- **Crawlers** —— 逐个爬虫设 Allow / Block / Charge，**全部设为 Allow**
- **Directives** —— 显示 Agent Readiness 评分链接
- **Metrics** —— **免费版只保留 24 小时数据**，建议定期截图存档做基线

**免费版的两个限制要知道：**

1. 只能按 **User-Agent 字符串**识别爬虫（付费版才有 Bot Management detection ID）—— 自报家门的爬虫能被识别，不报的不行。
2. **路径级例外规则需要 Pro 以上**，免费版做不了"放行 `/blog/*` 但拦 `/api/*`"这种精细操作。

**反向注意**：在 AI Crawl Control 里点 Block 会**自动在你的 zone 上创建一条 WAF 自定义规则**。如果你在 WAF 里手改了这条规则，AI Crawl Control 会识别并保留你的改动 —— 所以别在 WAF 里留一条写着 Block 的旧规则。

---

# 阶段 6：验证

## 6.1 自检脚本（必跑）

```bash
npm run check:live
```

它会用**真实的 AI 爬虫 UA** 逐个探测首页，并检查 robots.txt / llms.txt / sitemap / RSS。任何非 200 都说明边缘层在拦爬虫。

对照着确认这些都返回 200：

```
OAI-SearchBot · ChatGPT-User · GPTBot · ClaudeBot · Claude-User
PerplexityBot · Perplexity-User · Bytespider · Googlebot · Bingbot · Baiduspider
```

## 6.2 官方工具

访问 **`isitagentready.com`** 输入 `0733.fun`。这是 Cloudflare 自己在官方文档里推荐的 Agent 就绪度检测工具（AI Crawl Control 的 Directives 标签里就有入口）。

## 6.3 手工确认 robots.txt 干净

```bash
curl -s https://0733.fun/robots.txt
```

必须满足：

- ✅ 第一行是本站自己的注释
- ✅ 有 `Allow: /`
- ✅ 有 `Sitemap: https://0733.fun/sitemap-index.xml`
- ❌ **不能**出现 `<!DOCTYPE html>` 或任何 HTML
- ❌ **不能**出现 `# BEGIN Cloudflare Managed content`

## 6.4 首次上线后手动验证一遍

```bash
# 正文是否在 HTML 源码里（换成你文章里的一句话）
curl -s https://0733.fun/guide/ruhe-bei-ai-yinyong/ | grep -c "AI 不引用页面"

# 结构化数据
curl -s https://0733.fun/guide/ruhe-bei-ai-yinyong/ | grep -c 'application/ld+json'
```

## 6.5 上线后第 3、7、30 天复查

- **AI Crawl Control → Crawlers**：确认爬虫真的来了（免费版只有 24 小时窗口，要勤看）
- **Security → Events**：看有没有带 AI-bot 原因的拦截记录
- 直接去问：ChatGPT / Claude / Perplexity / DeepSeek「你知道 0733.fun 吗」

---

# 阶段 7：提交搜索引擎（推送比等待快 3–7 天）

| 平台 | 做什么 |
| --- | --- |
| **Google Search Console** | 验证域名、提交 `https://0733.fun/sitemap-index.xml` |
| **Bing Webmaster Tools** | 同上。ChatGPT 的检索与 Bing 索引重合度高，这个比 Google 还重要 |
| **IndexNow** | 密钥文件已就位：`public/8f3c1d9a4b7e4f2a8c5d6e1b0a9f7c3d.txt`。部署后访问 `https://0733.fun/8f3c1d9a4b7e4f2a8c5d6e1b0a9f7c3d.txt` 确认能打开，即可用该密钥推送 URL |
| **百度搜索资源平台** | 只在你要中文 AI（文心/豆包）覆盖时做。实测**主动推送 API 比被动等待快近一周**，效果比换服务器显著 |

IndexNow 推送示例（Windows PowerShell）：

```powershell
$body = @{
  host        = "0733.fun"
  key         = "8f3c1d9a4b7e4f2a8c5d6e1b0a9f7c3d"
  keyLocation = "https://0733.fun/8f3c1d9a4b7e4f2a8c5d6e1b0a9f7c3d.txt"
  urlList     = @("https://0733.fun/guide/ruhe-bei-ai-yinyong/")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.indexnow.org/indexnow" -Method Post `
  -ContentType "application/json; charset=utf-8" -Body $body
```

---

# 已知冲突与坑

## ⚠️ 托管的 robots.txt 与 Pages 的冲突

有实测报告：**开启 Cloudflare 托管的 robots.txt 后，Pages 项目在没有 `404.html` 时会执行默认回落逻辑，把 `index.html` 的 HTML 拼到你的 robots.txt 后面**，产出一个混着 `<!DOCTYPE html>` 的畸形文件，让爬虫解析失败。

**本站做了双重规避：**

1. 阶段 5 里已经把托管 robots.txt **关闭**，从根上避开。
2. `src/pages/404.astro` 会生成 `dist/404.html`，**请勿删除** —— 它让 Pages 不走 index.html 回落路径。

## 免费版 robots.txt 会返回一段政策注释

Cloudflare 文档说明：**免费版域名如果自己没有 robots.txt 且未启用托管功能，访问 `/robots.txt` 时会返回一段 Content Signals 政策注释文本。**

本站的 robots.txt 由 `src/pages/robots.txt.ts` 生成，是真实存在的文件，所以不会触发这个行为 —— 但如果你哪天把那个文件删了，记得回来处理。

## Google Search Console 可能报语法警告

Cloudflare 文档提示：GSC 偶尔会对 Content Signals 等较新的 robots.txt 指令报 `Syntax not understood`。官方观察是**对抓取率和 SEO 没有实际影响**，可以忽略。

## 其他

| 症状 | 原因 |
| --- | --- |
| 所有 AI 爬虫都 403 | Bot Fight Mode / AI Labyrinth / WAF 规则 / Under Attack Mode |
| robots.txt 出现 `Disallow: /` 但你没写 | 托管 robots.txt 默认内容，必须关闭 |
| robots.txt 里混着 HTML | 托管 robots.txt + 缺少 404.html |
| Googlebot 被拦 | 多用途爬虫按最严规则处理，检查 Training 类别是否被误开 |
| 页面 200 但 AI 读不到正文 | 正文是 JS 渲染的，或放图片里了 |
| 证书签发失败 | CAA 记录不允许 Cloudflare |
| 域名加不上 | 手动加了 CNAME 却没走 Custom domains 流程 |
| AI Crawl Control 里看不到东西 | 域名不在 Cloudflare zone 里（走了外部 DNS CNAME） |

---

# 9 月 15 日变更的应对

| 时间 | 动作 |
| --- | --- |
| **9/14 之前完成接入** | 沿用旧设置，但仍要按阶段 5 完整核对一遍 |
| **9/15 之后接入** | 去 Security settings 检查新的 AI 流量分类开关，确认 Agent / Training 没有在你的页面上被默认拦截 |
| **9/16 起** | 用 `npm run check:live` 全量验证一遍 |
| **每次大改配置后** | 都重跑一次 `npm run check:live` |

---

# 日常更新流程

```bash
npm run new -- blog  xinde-2026-10 "十月的一些想法"   # 新建
# 写完，把 frontmatter 的 draft: true 改成 false
npm run build
npm run check:local
git add . && git commit -m "新文章：十月的一些想法" && git push
```

推送后 Cloudflare Pages 会自动重新构建部署，通常 1–2 分钟。

---

# 附：做完后的核查总表

复制这张表逐项打勾：

- [ ] 本地 `npm run check:local` 0 失败
- [ ] Pages 项目构建成功，`pages.dev` 地址能打开
- [ ] 域名已是 Cloudflare zone，状态 Active
- [ ] Custom domain `0733.fun` 已生效，HTTPS 正常
- [ ] 托管 robots.txt **已关闭**
- [ ] Bot Fight Mode **已关闭**
- [ ] AI Labyrinth **已关闭**
- [ ] Under Attack Mode **已关闭**
- [ ] AI Crawl Control 里所有爬虫为 **Allow**
- [ ] WAF 里没有残留的 AI bot 拦截规则
- [ ] `curl https://0733.fun/robots.txt` 输出干净、有 Allow 与 Sitemap、无 HTML
- [ ] `npm run check:live` 全部 AI 爬虫 UA 返回 200
- [ ] `isitagentready.com` 检测通过
- [ ] 已提交 Google Search Console 与 Bing Webmaster Tools
- [ ] IndexNow 密钥文件可访问
- [ ] `src/site.config.ts` 里的笔名、简介、`sameAs` 已填写
- [ ] 「关于」页的联系方式已填写
- [ ] 示例内容（`weihe-chun-wenben`、`shili-shuming`）已删除或改写
