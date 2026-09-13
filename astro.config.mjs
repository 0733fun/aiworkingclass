// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/site.config.ts';

/**
 * 面向 AI 检索的构建配置。几个关键决定：
 *
 * - 纯静态输出（无 SSR）：正文 100% 落在 HTML 源码里，AI 爬虫无需执行 JS
 * - trailingSlash: 'always'：全站 URL 形式统一，canonical 只有一种形态
 * - 不使用任何 client 端 JS 框架：零 JS 负载，Core Web Vitals 天然优秀
 * - sitemap 自动生成，且 lastmod 用真实更新时间
 */
export default defineConfig({
  site: SITE.url,

  trailingSlash: 'always',

  build: {
    // 输出 /about/index.html，对应 URL /about/
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // 压缩 HTML 输出，去掉无意义空白
  compressHTML: true,

  // 开发服务器
  server: { port: 4321 },

  integrations: [
    sitemap({
      // 站点首页 + 所有内容页
      filter: (page) => !page.includes('/draft/'),
      changefreq: 'weekly',
      priority: 0.7,
      // 让 sitemap 里的 lastmod 反映真实更新时间
      serialize(item) {
        if (item.url === `${SITE.url}/`) {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        return item;
      },
    }),
  ],
});
