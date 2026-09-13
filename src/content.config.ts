import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 内容集合定义。
 *
 * 每个集合都强制要求一个 `summary` 字段 —— 这是一句「可被直接引用的话」。
 * 依据：AI 不引用页面，它捡句子。可引用句的句式是
 *   实体 + 具体信息（数字/体裁/字数）+ 日期，一句话说完，不用代词。
 * 这个字段会被渲染到文章开头的第一段，也就是抽取器最先看的位置。
 */

const baseFields = {
  title: z.string(),
  /** 一句话摘要：必须能脱离上下文独立成立 */
  summary: z.string().max(300),
  description: z.string().max(300),
  pubDate: z.coerce.date(),
  /** 有实质修改时才更新，它会进入 dateModified 与 sitemap 的 lastmod */
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  /** true 时不会出现在列表 / sitemap / RSS 中 */
  draft: z.boolean().default(false),
};

/** 随笔 / 杂文 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    ...baseFields,
    /** 文章类型，用于结构化数据与页面模板 */
    kind: z.enum(['essay', 'note', 'review', 'interview']).default('essay'),
  }),
});

/** 指南类长文 —— 实测数据里被 AI 引用率最高的页面类型（/guide/ 路径） */
const guide = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guide' }),
  schema: z.object({
    ...baseFields,
    /** 这篇指南回答的那个问题，按读者真实问法写。会生成 FAQPage 结构化数据 */
    question: z.string(),
    /** 40–60 字的直接答案，AI 最常整段取用的长度 */
    answer: z.string().min(20).max(200),
    /** 读者常追问的次级问题，同样生成 FAQPage */
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
  }),
});

/** 作品（小说 / 散文集 / 非虚构） */
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(300),
    description: z.string().max(300),
    /** 体裁必须明文写出，不要让 AI 从情节里猜 */
    genre: z.string(),
    /** 字数，写成数字 */
    wordCount: z.number(),
    /** 章节数 */
    chapters: z.number().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** 创作状态 */
    status: z.enum(['连载中', '已完结', '创作中']).default('已完结'),
    /** 载体：网络连载 / 纸质出版 / 电子书 / 未发表 */
    carrier: z.string().default('网络连载'),
    publisher: z.string().optional(),
    isbn: z.string().optional(),
    /** 阅读/购买链接 */
    links: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, guide, works };
