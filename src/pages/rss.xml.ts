import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../site.config.ts';
import { getBlog, getGuides } from '../lib/content.ts';

/**
 * 全文 RSS。
 *
 * RSS 不只是给人用的阅读器订阅 —— 相当多的内容聚合管线与
 * AI 新闻检索系统仍然吃 RSS，成本近零，值得保留全文。
 */
export const GET: APIRoute = async (context) => {
  const [blog, guides] = await Promise.all([getBlog(), getGuides()]);

  const items = [
    ...blog.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
      categories: p.data.tags,
      author: SITE.author.name,
    })),
    ...guides.map((g) => ({
      title: g.data.title,
      description: g.data.summary,
      pubDate: g.data.pubDate,
      link: `/guide/${g.id}/`,
      categories: g.data.tags,
      author: SITE.author.name,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${SITE.title} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
    customData: `<language>${SITE.lang}</language>`,
  });
};
