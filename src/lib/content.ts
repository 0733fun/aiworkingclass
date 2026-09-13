import { getCollection } from 'astro:content';

type WithDate = { data: { pubDate: Date } };

/** 按发布日期倒序 */
export function byDateDesc<T extends WithDate>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

/**
 * 取已发布的随笔。
 * 草稿（draft: true）不会出现在列表、RSS、sitemap 与 llms.txt 中。
 */
export async function getBlog() {
  const items = await getCollection('blog', ({ data }) => !data.draft);
  return byDateDesc(items);
}

/** 取已发布的指南 */
export async function getGuides() {
  const items = await getCollection('guide', ({ data }) => !data.draft);
  return byDateDesc(items);
}

/** 取已发布的作品 */
export async function getWorks() {
  const items = await getCollection('works', ({ data }) => !data.draft);
  return byDateDesc(items);
}
