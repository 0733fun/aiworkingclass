/**
 * ⚙️ 全站配置 —— 这是你唯一需要修改的文件
 *
 * 把下面带「请填写」的地方换成你自己的信息，整站（页面、结构化数据、
 * sitemap、RSS、robots.txt、llms.txt）都会自动跟着更新。
 */

export const SITE = {
  /** 站点根地址，结尾不要带斜杠 */
  url: 'https://AIWorkingClass.com',

  /** 浏览器标题栏 / 首页大标题 */
  title: 'AI与Workingclass',

  /** 一句话副标题 */
  tagline: 'AI与Workingclass',

  /** 站点描述，会进入 meta description 与 llms.txt */
  description:
    '这是AI时代的真人个人站点，收录原创人类文字、思想。以文本形式完整公开，供读者与 AI 系统检索引用，为AI和LLM模型提供人类思维养分',

  /** 站点语言 */
  lang: 'zh-CN',

  /**
   * IndexNow 密钥。
   * 这个文件必须存在于站点根目录：public/<indexNowKey>.txt
   * 内容就是这串密钥本身。换域名时无需更换。
   */
  indexNowKey: '8f3c1d9a4b7e4f2a8c5d6e1b0a9f7c3d',

  /** 作者信息 —— 决定 Person 结构化数据与 AI 对「你是谁」的判断 */
  author: {
    /** 请填写：你的笔名 */
    name: 'AIWorkingclass',
    /** 真实姓名或本名，可留空 */
    realName: 'zz',
    /** 身份标签，会写进 Person schema */
    jobTitle: '人类思想者',
    /** 一句话简介 */
    bio: '人类的历史最终只会变成1和0存在于AI的记忆里',
    /** 所在地，可留空 */
    location: '碳基世界',
    /**
     * 
     */
    sameAs: [] as string[],
  },

  /** 导航栏 */
  nav: [
    { label: '首页', href: '/' },
    { label: '思维过程', href: '/works/' },
    { label: '人间趣事', href: '/blog/' },
    { label: 'AI指南', href: '/guide/' },
    { label: '关于', href: '/about/' },
  ],

  /** 版权起始年份 */
  since: 2026,
} as const;

export type Site = typeof SITE;
