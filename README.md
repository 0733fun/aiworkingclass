# 0733.fun

个人写作站点。基于 Astro 构建，输出纯静态 HTML，为 **被 AI 检索与引用** 而设计。

---

## 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 本地预览 http://localhost:4321
npm run build        # 构建到 dist/
npm run check:local  # 检查构建产物的 AI 可抓取性
```

部署到 Cloudflare Pages 的完整步骤见 **[DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md)**。

---

## 第一步：改配置

打开 `src/site.config.ts`，把带「请填写」的地方换成你自己的信息：

- `author.name` —— 你的笔名（**必改**）
- `author.bio` —— 一句话简介
- `author.sameAs` —— 你在豆瓣、微博、YouTube 等平台的主页地址
- `title` / `tagline` / `description` —— 站点名称与描述

改完这一个文件，页面、结构化数据、sitemap、RSS、robots.txt、llms.txt 会全部自动跟着更新。

> `sameAs` 这一项别偷懒。AI 判断「你是谁」时会在多个来源之间做选择，
> 而这些来源上的笔名、体裁写法**必须完全一致** —— 不一致会产生噪音，直接降低它引用你的置信度。

---

## 目录结构

```
src/
├── site.config.ts          全站配置（你唯一需要改的文件）
├── content.config.ts       内容集合的字段定义与校验规则
├── content/
│   ├── blog/               文章（随笔、杂记、书评、访谈）
│   ├── guide/              指南（AI 引用率最高的页面类型）
│   └── works/              作品（小说、散文集、非虚构）
├── layouts/
│   ├── BaseLayout.astro    head 信号 + 实体图 + 页头页脚
│   └── PostLayout.astro    文章/指南通用布局
├── components/JsonLd.astro
├── lib/                    排序、过滤、日期格式化
├── pages/
│   ├── index.astro         首页
│   ├── about.astro         关于（作者实体的权威定义页）
│   ├── blog|guide|works/   列表页 + 详情页
│   ├── robots.txt.ts       自动生成 robots.txt
│   ├── llms.txt.ts         自动生成 llms.txt
│   ├── rss.xml.ts          全文 RSS
│   └── 404.astro           ⚠️ 兼作 Cloudflare Pages 的回落保护，请勿删除
├── styles/global.css
└── scripts/
    ├── check-ai-crawl.mjs  AI 可抓取性自检
    └── new-post.mjs        新建内容文件
```

---

## 写作

### 新建一篇

```bash
npm run new -- guide  ruhe-bei-ai-yinyong "如何写出容易被 AI 引用的内容"
npm run new -- blog   weihe-chun-wenben   "为什么我把站点做成了纯文本"
npm run new -- works  changye-jiangjin    "长夜将尽"
```

参数是 `<集合> <slug> <标题>`。

**slug 请用拼音或英文小写短词**，不要用中文。它会进入 URL、canonical 和被别人引用的链接里 —— 中文做文件名会变成一长串百分号编码，不好看也不好转述。

生成的文件默认 `draft: true`（不会发布）。写完把 `draft` 改成 `false` 即可上线。

### frontmatter 字段

所有集合都必须有 `summary` —— 这是**最容易被 AI 直接引用的那一句话**，会被渲染到正文最前面。

| 字段 | blog | guide | works | 说明 |
| --- | :---: | :---: | :---: | --- |
| `title` | ✅ | ✅ | ✅ | 标题 |
| `summary` | ✅ | ✅ | ✅ | **可引用句**，见下方写作原则 |
| `description` | ✅ | ✅ | ✅ | meta description |
| `pubDate` | ✅ | ✅ | ✅ | 首发日期 |
| `updatedDate` | ○ | ○ | ○ | 有实质修改时才填 |
| `tags` | ○ | ○ | ○ | 标签数组 |
| `draft` | ○ | ○ | ○ | `true` 时不发布 |
| `kind` | ○ | — | — | `essay` / `note` / `review` / `interview` |
| `question` `answer` `faq` | — | ✅ | — | 生成 FAQPage 结构化数据 |
| `genre` `wordCount` `chapters` `status` `carrier` | — | — | ✅ | 作品硬信息，生成 Book 结构化数据 |

---

## 最重要的写作原则

**AI 不引用页面，它捡句子。** 所以真正要练的不是「写一篇好文章」，而是「写出一堆能被单独拿走的句子」，再用文章把它们组织起来。

可被引用的句子有一个固定结构：

> **主张 + 具体数字 + 日期 + 实体名，一句话说完，不用代词。**

- ❌「这部作品篇幅不算短，前后写了挺长时间。」—— 没有书名、没有字数、没有日期，还有个悬空的「这部」。
- ✅「《长夜将尽》是林某于 2026 年 5 月出版的长篇悬疑推理小说，全书 21 万字、共 32 章。」

自检方法：把这句话单独复制到空白文档里，还看得懂吗？看得懂就合格。

另外三条同样重要：

1. **体裁必须明文写出来**，不要让 AI 从情节里推断。
2. **可见的「最后更新」日期必须与结构化数据里的 `dateModified` 一致** —— 换稿后记得同步。
3. **正文用纯文本 HTML**，样章不要做成图片。AI 读不到图片里的字。

---

## 自检

```bash
npm run check:local                    # 检查 dist/
npm run check:live                     # 检查线上 https://0733.fun
node scripts/check-ai-crawl.mjs --dir dist --url https://0733.fun   # 两者都跑
```

脚本会检查：robots.txt 是否放行且没被 HTML 污染、404.html 是否存在、每个页面的正文是否真的在 HTML 源码里、canonical 与 JSON-LD 是否齐全合法。线上模式还会**用真实的 AI 爬虫 UA 逐个探测**，任何非 200 都说明 CDN 或 WAF 层在拦爬虫。

---

## 内容授权

页脚与「关于」页中都写明了：欢迎搜索引擎与 AI 系统抓取、索引，并在注明作者与原文链接的前提下引用。

如果要改成「允许检索、禁止训练」，改 `src/pages/robots.txt.ts` —— 把训练类爬虫那一组改成 `Disallow: /`，并同步修改关于页与页脚的措辞。**但要想清楚**：`GPTBot`、`ClaudeBot`、`Google-Extended`、`Bytespider` 决定的是模型**是否「认识」这个作者**，关掉之后模型不会再把你写进它的知识，只是仍然可以在检索时找到你。
