#!/usr/bin/env node
/**
 * AI 可抓取性自检
 * ============================================================================
 *
 * 两种模式：
 *
 *   npm run check:local           检查本地构建产物 dist/
 *   npm run check:live            检查线上站点（默认 https://0733.fun）
 *   node scripts/check-ai-crawl.mjs --url https://example.com
 *   node scripts/check-ai-crawl.mjs --dir dist --url https://0733.fun   # 两者都跑
 *
 * 检查重点是「AI 到底能不能读到你的内容」，而不是样式或性能：
 *   1. robots.txt 是否放行、是否被 HTML 污染、是否声明了 Sitemap
 *   2. 是否存在 404.html（避免 Cloudflare Pages 的 robots.txt 回落冲突）
 *   3. 每个页面的正文是否真的在 HTML 源码里（而不是靠 JS 渲染）
 *   4. canonical / robots meta / JSON-LD 是否齐全且合法
 *   5. 线上模式下用真实 AI 爬虫 UA 实测，拦截会被明确报出来
 *
 * 零依赖，只用 Node 内置模块。
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

function argValue(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

const dirArg = argValue('--dir');
const urlArg = argValue('--url');
const DEFAULT_URL = 'https://0733.fun';

const targetUrl = urlArg ?? (dirArg ? null : DEFAULT_URL);
const targetDir = dirArg ?? (urlArg ? null : 'dist');

// ---------------------------------------------------------------------------
// 报告工具
// ---------------------------------------------------------------------------

const results = { pass: 0, fail: 0, warn: 0, notes: [] };

const C = process.stdout.isTTY
  ? { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' }
  : { g: '', r: '', y: '', d: '', b: '', x: '' };

function ok(msg, detail) {
  results.pass++;
  console.log(`  ${C.g}✓${C.x} ${msg}${detail ? ` ${C.d}${detail}${C.x}` : ''}`);
}

function bad(msg, detail) {
  results.fail++;
  console.log(`  ${C.r}✗${C.x} ${msg}${detail ? ` ${C.d}${detail}${C.x}` : ''}`);
}

function warn(msg, detail) {
  results.warn++;
  console.log(`  ${C.y}!${C.x} ${msg}${detail ? ` ${C.d}${detail}${C.x}` : ''}`);
}

function section(title) {
  console.log(`\n${C.b}${title}${C.x}`);
}

function note(text) {
  results.notes.push(text);
}

// ---------------------------------------------------------------------------
// 共用检查逻辑
// ---------------------------------------------------------------------------

/**
 * 检查 robots.txt 内容。
 *
 * 关键规则：在 `User-agent: *` 分组下出现 `Disallow: /` 就是全站封禁，
 * 这是零引用最常见的死因 —— 而且多半是模板或托管平台默认写进去的。
 */
function checkRobotsTxt(body, label) {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (/<(!doctype|html|head|body)/i.test(body)) {
    bad(
      `${label} 被 HTML 污染`,
      '文件里出现了 HTML 标签，爬虫会解析失败',
    );
    note(
      'robots.txt 里出现 HTML：这是 Cloudflare「托管 robots.txt」与 Pages 已知冲突的症状。' +
        '请到 Security Settings → Bot traffic 关闭托管 robots.txt，并确认项目里有 404.html。',
    );
  } else {
    ok(`${label} 是纯文本，没有被 HTML 污染`);
  }

  // 逐组解析，找出 User-agent: * 分组下的 Disallow
  let currentAgents = [];
  let starGroupDisallows = [];
  for (const line of lines) {
    const m = /^user-agent:\s*(.+)$/i.exec(line);
    if (m) {
      currentAgents.push(m[1].trim().toLowerCase());
      continue;
    }
    const d = /^disallow:\s*(.*)$/i.exec(line);
    if (d) {
      if (currentAgents.includes('*')) starGroupDisallows.push(d[1].trim());
      continue;
    }
    if (/^(allow|sitemap|crawl-delay|content-signal|host)\s*:/i.test(line)) continue;
    currentAgents = [];
  }

  const blocksAll = starGroupDisallows.some(
    (p) => p === '/' || p === '/*' || p === '',
  );

  if (blocksAll) {
    bad(
      `${label} 在 User-agent: * 下禁止了全站`,
      'Disallow: / 意味着所有爬虫都被挡在门外',
    );
    note(
      'robots.txt 里 `User-agent: *` + `Disallow: /` = 全站封禁。' +
        '这是模板或托管平台默认写入的，必须删掉。',
    );
  } else if (starGroupDisallows.length > 0) {
    warn(
      `${label} 的 User-agent: * 下有 ${starGroupDisallows.length} 条 Disallow`,
      starGroupDisallows.join(', '),
    );
  } else if (/^allow:\s*\/\s*$/im.test(body)) {
    ok(`${label} 全站放行`, 'Allow: /');
  }

  // 已知会被默认写入、且与"最大可抓取"目标相反的训练爬虫
  const trainingBots = [
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'Bytespider',
    'CCBot',
    'Applebot-Extended',
    'meta-externalagent',
  ];
  const blockedTraining = trainingBots.filter((bot) => {
    const re = new RegExp(
      `user-agent:\\s*${bot.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\n(?:[^\\n]*\\n)*?disallow:\\s*\\/\\s*(?:\\n|$)`,
      'i',
    );
    return re.test(body);
  });

  if (blockedTraining.length > 0) {
    bad(
      `${label} 封禁了训练类爬虫`,
      blockedTraining.join(', '),
    );
    note(
      `robots.txt 明确 Disallow 了 ${blockedTraining.join('、')}。` +
        '如果你的目标是「让 AI 认识这个作者」，这些必须放行。',
    );
  }

  if (/^sitemap:\s*https?:\/\//im.test(body)) {
    const sm = /^sitemap:\s*(\S+)/im.exec(body)[1];
    ok(`${label} 声明了 Sitemap`, sm);
  } else {
    warn(`${label} 没有声明 Sitemap`, '建议补一行 Sitemap: <你的域名>/sitemap-index.xml');
  }
}

/** 从 HTML 里抽取结构化数据并校验 JSON 合法性 */
function checkHtmlPage(html, pagePath, is404) {
  const issues = [];

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!title || !title[1].trim()) issues.push('缺少 <title>');

  const canonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.exec(html);
  if (!canonical) issues.push('缺少 rel="canonical"');

  const robotsMeta = /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i.exec(html);
  if (!is404 && robotsMeta && /noindex/i.test(robotsMeta[1])) {
    issues.push('robots meta 含 noindex');
  }
  if (!is404 && !robotsMeta) issues.push('缺少 robots meta');

  // JSON-LD
  const ldBlocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  if (ldBlocks.length === 0) {
    issues.push('没有 application/ld+json 结构化数据');
  } else {
    for (const [i, b] of ldBlocks.entries()) {
      try {
        JSON.parse(b[1]);
      } catch {
        issues.push(`第 ${i + 1} 个 JSON-LD 块不是合法 JSON`);
      }
    }
  }

  // 正文是否真的在 HTML 源码里
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const wordish = text.split(/\s+/).filter((w) => w.length > 1).length;
  const contentUnits = cjkCount + wordish;

  if (contentUnits < 50) {
    issues.push(
      `HTML 源码里可读文本过少（约 ${contentUnits} 个字符/词），正文可能依赖 JS 渲染`,
    );
  }

  return { issues, ldCount: ldBlocks.length, contentUnits };
}

// ---------------------------------------------------------------------------
// 本地模式
// ---------------------------------------------------------------------------

async function walkHtml(dir) {
  const out = [];
  async function rec(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else if (e.name.endsWith('.html')) out.push(full);
    }
  }
  await rec(dir);
  return out.sort();
}

async function runLocal(dir) {
  console.log(`${C.b}本地构建产物检查${C.x} ${C.d}${dir}${C.x}`);

  if (!existsSync(dir)) {
    bad(`目录不存在：${dir}`, '先运行构建');
    return;
  }

  section('1. 机器可读文件');

  const robotsPath = path.join(dir, 'robots.txt');
  if (existsSync(robotsPath)) {
    const body = await readFile(robotsPath, 'utf8');
    ok('robots.txt 存在', `${body.length} 字节`);
    checkRobotsTxt(body, 'robots.txt');
  } else {
    bad('缺少 robots.txt');
  }

  const fourOhFour = path.join(dir, '404.html');
  if (existsSync(fourOhFour)) {
    ok(
      '404.html 存在',
      '规避 Cloudflare Pages 上 robots.txt 与 index.html 的回落冲突',
    );
  } else {
    warn(
      '缺少 404.html',
      'Cloudflare Pages 在没有 404.html 时可能把 index.html 拼进 robots.txt',
    );
  }

  for (const f of ['llms.txt', 'sitemap-index.xml', 'rss.xml', '_headers']) {
    const p = path.join(dir, f);
    if (existsSync(p)) {
      const s = await stat(p);
      ok(`${f} 存在`, `${s.size} 字节`);
    } else {
      warn(`缺少 ${f}`);
    }
  }

  section('2. 页面内容');

  const pages = await walkHtml(dir);
  if (pages.length === 0) {
    bad('没有找到任何 HTML 页面');
  } else {
    ok(`共 ${pages.length} 个 HTML 页面`);
    for (const p of pages) {
      const rel = '/' + path.relative(dir, p).split(path.sep).join('/');
      const html = await readFile(p, 'utf8');
      const is404 = rel === '/404.html';
      const { issues, ldCount, contentUnits } = checkHtmlPage(html, rel, is404);

      if (issues.length === 0) {
        ok(
          rel,
          `正文约 ${contentUnits} 字符 · ${ldCount} 个 JSON-LD 块`,
        );
      } else {
        bad(rel, issues.join('；'));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 线上模式
// ---------------------------------------------------------------------------

/** 用真实 UA 探测，任何非 200 都说明边缘层可能拦了 AI 爬虫 */
const AI_AGENTS = [
  ['OAI-SearchBot (OpenAI 检索)', 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)'],
  ['ChatGPT-User (OpenAI 实时抓取)', 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)'],
  ['GPTBot (OpenAI 训练)', 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)'],
  ['ClaudeBot (Anthropic)', 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
  ['Claude-User (Anthropic)', 'Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)'],
  ['PerplexityBot', 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'],
  ['Perplexity-User', 'Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)'],
  ['Bytespider (字节/豆包)', 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)'],
  ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
  ['Baiduspider', 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'],
];

async function fetchText(url, ua, timeoutMs = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua ?? 'Mozilla/5.0 (compatible; ai-crawl-check/1.0)',
        Accept: '*/*',
      },
      redirect: 'follow',
      signal: ctl.signal,
    });
    const body = await res.text();
    return { status: res.status, body, ok: res.ok };
  } finally {
    clearTimeout(t);
  }
}

async function runLive(base) {
  const root = base.replace(/\/+$/, '');
  console.log(`${C.b}线上站点检查${C.x} ${C.d}${root}${C.x}`);

  section('1. 机器可读文件');

  for (const [label, p] of [
    ['robots.txt', '/robots.txt'],
    ['llms.txt', '/llms.txt'],
    ['sitemap-index.xml', '/sitemap-index.xml'],
    ['rss.xml', '/rss.xml'],
  ]) {
    try {
      const r = await fetchText(`${root}${p}`);
      if (r.status === 200) {
        ok(`${label} 可访问`, `${r.body.length} 字节`);
        if (p === '/robots.txt') checkRobotsTxt(r.body, 'robots.txt');
      } else {
        bad(`${label} 返回 ${r.status}`);
      }
    } catch (e) {
      bad(`${label} 请求失败`, e.message);
    }
  }

  section('2. 客户端探测（不伪造 UA）');
  try {
    const r = await fetchText(`${root}/`);
    if (r.status === 200) {
      ok('首页可访问', `${r.body.length} 字节`);
      const { issues, ldCount, contentUnits } = checkHtmlPage(r.body, '/', false);
      if (issues.length === 0) {
        ok('首页结构完整', `正文约 ${contentUnits} 字符 · ${ldCount} 个 JSON-LD 块`);
      } else {
        bad('首页结构有问题', issues.join('；'));
      }
    } else {
      bad(`首页返回 ${r.status}`);
    }
  } catch (e) {
    bad('首页请求失败', e.message);
  }

  section('3. 用真实 AI 爬虫 UA 探测');
  console.log(
    `${C.d}  非 200 = 边缘层（CDN/WAF）在拦 AI 爬虫。robots.txt 管不到这一层。${C.x}`,
  );

  let blocked = 0;
  for (const [label, ua] of AI_AGENTS) {
    try {
      const r = await fetchText(`${root}/`, ua);
      if (r.status === 200) {
        ok(label, '200');
      } else {
        blocked++;
        bad(label, `HTTP ${r.status}`);
      }
    } catch (e) {
      blocked++;
      bad(label, e.message);
    }
  }

  if (blocked > 0) {
    note(
      `有 ${blocked} 个 AI 爬虫被拦截。检查顺序：Cloudflare 的 Bot Fight Mode、` +
        'AI Labyrinth、AI Crawl Control 的 Crawlers 动作、WAF 自定义规则、Under Attack Mode。',
    );
  } else {
    ok('全部 AI 爬虫 UA 均返回 200');
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  if (targetDir) await runLocal(targetDir);
  if (targetUrl) {
    if (targetDir) console.log('');
    await runLive(targetUrl);
  }

  console.log(
    `\n${C.b}结果${C.x}  ${C.g}通过 ${results.pass}${C.x}  ${C.r}失败 ${results.fail}${C.x}  ${C.y}警告 ${results.warn}${C.x}`,
  );

  if (results.notes.length > 0) {
    console.log(`\n${C.b}需要处理${C.x}`);
    for (const n of results.notes) console.log(`  ${C.y}·${C.x} ${n}`);
  }

  if (results.fail > 0) {
    console.log('');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('自检脚本异常：', e);
  process.exitCode = 2;
});
