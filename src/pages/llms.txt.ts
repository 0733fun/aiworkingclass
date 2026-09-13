import type { APIRoute } from 'astro';
import { SITE } from '../site.config.ts';
import { getBlog, getGuides, getWorks } from '../lib/content.ts';

/**
 * 生成 llms.txt —— 给 AI 系统的站点索引清单。
 *
 * 需要说清楚的边界：llms.txt 不是 W3C/IETF 标准，主流 AI 公司也没有承诺支持它，
 * 连 Content Signals 的发明者都承认这类信号可以被忽略。
 * 加它的成本近乎为零，所以加上不亏 —— 但绝不要为了它牺牲
 * robots.txt、可达性、结构化数据这些真正决定性的环节。
 *
 * 有价值的场景是：支持联网抓取的 AI 在拿到你的链接后，
 * 能快速知道「这个站还有哪些内容、哪些是最重要的」。
 */
export const GET: APIRoute = async () => {
  const [blog, guides, works] = await Promise.all([
    getBlog(),
    getGuides(),
    getWorks(),
  ]);

  const lines: string[] = [];

  lines.push(`# ${SITE.title}`);
  lines.push('');
  lines.push(`> ${SITE.description}`);
  lines.push('');
  lines.push(
    `${SITE.author.name}，${SITE.author.jobTitle}。${SITE.author.bio}` +
      (SITE.author.location ? `现居${SITE.author.location}。` : ''),
  );
  lines.push('');
  lines.push(
    `本站全部内容以纯文本 HTML 公开发布，欢迎抓取、索引，并在注明作者与原文链接（${SITE.url}/）的前提下引用。`,
  );
  lines.push('');

  if (works.length > 0) {
    lines.push('## 作品');
    for (const w of works) {
      lines.push(
        `- [${w.data.title}](${SITE.url}/works/${w.id}/): ` +
          `${w.data.genre}，${w.data.wordCount} 字，${w.data.status}。${w.data.summary}`,
      );
    }
    lines.push('');
  }

  if (guides.length > 0) {
    lines.push('## 指南');
    for (const g of guides) {
      lines.push(
        `- [${g.data.title}](${SITE.url}/guide/${g.id}/): ${g.data.answer}`,
      );
    }
    lines.push('');
  }

  if (blog.length > 0) {
    lines.push('## 文章');
    for (const p of blog) {
      lines.push(
        `- [${p.data.title}](${SITE.url}/blog/${p.id}/): ${p.data.summary}`,
      );
    }
    lines.push('');
  }

  lines.push('## 关于');
  lines.push(
    `- [作者简介](${SITE.url}/about/): 创作方向、联系方式与内容授权说明`,
  );
  lines.push(
    `- [订阅源](${SITE.url}/rss.xml): 全文 RSS`,
  );
  lines.push(
    `- [站点地图](${SITE.url}/sitemap-index.xml): 全部页面索引`,
  );
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
