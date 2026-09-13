#!/usr/bin/env node
/**
 * 新建内容文件
 * ============================================================================
 *
 *   npm run new -- blog  weihe-chun-wenben "为什么我把站点做成了纯文本"
 *   npm run new -- guide ruhe-bei-ai-yinyong "如何写出容易被 AI 引用的内容"
 *   npm run new -- works changye-jiangjin "长夜将尽"
 *
 * 参数顺序：<集合> <slug> [标题]
 *
 * 为什么要求显式给 slug：URL 会进入 canonical、sitemap 和被引用的链接里。
 * 中文直接做文件名会变成一长串百分号编码，既不好看也不利于别人转述。
 * 建议用拼音或英文短词，全小写，用连字符分隔。
 *
 * 生成的文件已经带好正确的 frontmatter 骨架 —— 包括那个最重要的
 * `summary` 字段（可被 AI 直接引用的一句话）。
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const COLLECTIONS = {
  blog: {
    dir: 'src/content/blog',
    label: '文章',
    body: [
      '## 正文',
      '',
      '<!-- 把最重要、最希望被引用的事实放在开头的 summary 字段里，',
      '     它会被渲染成正文第一段，也就是抽取器最先看的位置。 -->',
      '',
      '在这里开始写。',
      '',
    ],
  },
  guide: {
    dir: 'src/content/guide',
    label: '指南',
    body: [
      '## 背景',
      '',
      '<!-- 指南类页面是 AI 引用率最高的页面类型。',
      '     把 question / answer / faq 填好，会自动生成 FAQPage 结构化数据。 -->',
      '',
      '在这里展开说明。',
      '',
    ],
  },
  works: {
    dir: 'src/content/works',
    label: '作品',
    body: [
      '## 一句话简介',
      '',
      '请在这里写一句话简介。',
      '',
      '## 故事梗概',
      '',
      '请在这里写 200–400 字的梗概。',
      '',
      '## 样章',
      '',
      '请把样章以纯文本形式贴在这里，不要用图片。',
      '',
    ],
  },
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function frontmatter(collection, title, slug) {
  const date = today();
  const quote = (s) => `"${s.replace(/"/g, '\\"')}"`;

  if (collection === 'works') {
    return `---
title: ${quote(title)}
summary: ${quote(`《${title}》是「你的笔名」于 ${date.slice(0, 4)} 年出版的……，全书 0 万字、共 0 章。`)}
description: ${quote(`${title} 的作品页。`)}
genre: 请填写体裁
wordCount: 0
chapters: 0
pubDate: ${date}
status: 创作中
carrier: 网络连载
# publisher: 某某出版社
# isbn: 978-7-xxxx-xxxx-x
links: []
tags: []
draft: true
---`;
  }

  if (collection === 'guide') {
    return `---
title: ${quote(title)}
summary: ${quote('把这篇指南最核心的结论写成一句包含实体、数字和日期的独立陈述。')}
description: ${quote(`${title} —— 一篇可操作的指南。`)}
question: ${quote('这篇指南回答的那个问题，按读者的真实问法写。')}
answer: ${quote('40 到 60 字的直接答案，AI 最常整段取用的就是这个长度。')}
pubDate: ${date}
tags: []
faq:
  - q: ${quote('读者常追问的第一个问题？')}
    a: ${quote('直接回答，同样控制在 40–60 字。')}
draft: true
---`;
  }

  return `---
title: ${quote(title)}
summary: ${quote('把这篇随笔最核心的判断写成一句脱离上下文仍能成立的陈述。')}
description: ${quote(`${title} —— 一篇随笔。`)}
kind: essay
pubDate: ${date}
tags: []
draft: true
---`;
}

async function main() {
  const [collection, slug, ...titleParts] = process.argv.slice(2);

  if (!collection || !COLLECTIONS[collection]) {
    console.error(
      `用法：npm run new -- <${Object.keys(COLLECTIONS).join('|')}> <slug> [标题]`,
    );
    process.exitCode = 1;
    return;
  }

  if (!slug) {
    console.error('请提供 slug（建议用拼音或英文小写短词，连字符分隔）');
    process.exitCode = 1;
    return;
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error(
      `slug "${slug}" 不合法：只允许小写字母、数字和连字符，且不能以连字符开头。`,
    );
    process.exitCode = 1;
    return;
  }

  const title = titleParts.join(' ').trim() || slug;
  const cfg = COLLECTIONS[collection];
  const dir = cfg.dir;
  const file = path.join(dir, `${slug}.md`);

  if (existsSync(file)) {
    console.error(`文件已存在：${file}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(dir, { recursive: true });

  const content = [
    frontmatter(collection, title, slug),
    '',
    ...cfg.body,
  ].join('\n');

  await writeFile(file, content, 'utf8');

  console.log(`已创建 ${cfg.label}：${file}`);
  console.log('');
  console.log('接下来：');
  console.log('  1. 填好 summary 字段 —— 这是最容易被 AI 引用的一句话');
  console.log('  2. 写完正文');
  console.log('  3. 把 frontmatter 里的 draft: true 改成 false');
  console.log('  4. npm run build && npm run check:local');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
