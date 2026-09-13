import type { APIRoute } from 'astro';
import { SITE } from '../site.config.ts';

/**
 * 生成 robots.txt。
 *
 * 策略：全站放行。一行 `Allow: /` 即表示不限制任何爬虫 ——
 * 不写任何 Disallow，就是全部允许。
 *
 * ⚠️ 注意：本文件由代码生成，因此 Cloudflare 上必须【关闭】托管的 robots.txt
 * （Security Settings → Bot traffic → "Set your preference to block training in
 * robots.txt"）。那个托管版本会在你的 robots.txt 前面插入一段，明确 Disallow 掉
 * GPTBot / ClaudeBot / Google-Extended / Bytespider / CCBot 等训练爬虫，与本站目标相反。
 */
export const GET: APIRoute = () => {
  const body = `# ${SITE.title} — ${SITE.tagline}
# 全站开放检索与引用。本站内容以纯文本 HTML 发布，欢迎 AI 系统抓取索引。

User-agent: *
Allow: /

# 明确声明：不限制任何主流 AI 爬虫
# 检索/引用类（决定内容能否出现在 AI 回答里）
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: Claude-Web
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Agent
User-agent: GoogleAgent-Mariner
User-agent: GrokBot
User-agent: xAI-Grok
User-agent: Grok-DeepSearch
User-agent: MicrosoftCopilotBot
User-agent: Applebot
User-agent: Applebot-Extended
User-agent: DuckAssistBot
User-agent: Amazonbot
Allow: /

# 训练类（决定模型是否"认识"这个作者）
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
User-agent: Google-Extended
User-agent: CCBot
User-agent: meta-externalagent
User-agent: meta-webindexer
Allow: /

# 中文 AI 平台
User-agent: Bytespider
User-agent: DeepSeekBot
User-agent: DeepSeek Chat
User-agent: DeepSeek
User-agent: Kimi
User-agent: Doubao
User-agent: ChatGLM
Allow: /

# 传统搜索引擎
User-agent: Googlebot
User-agent: Bingbot
User-agent: Baiduspider
User-agent: Sogou web spider
User-agent: 360Spider
User-agent: YisouSpider
Allow: /

Sitemap: ${SITE.url}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
