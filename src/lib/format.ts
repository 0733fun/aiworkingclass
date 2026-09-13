/** 统一的日期格式化：始终输出 YYYY-MM-DD，避免中英混杂与本地化歧义 */
export function fmtDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 结构化数据用的完整 ISO 时间 */
export function isoDate(d: Date): string {
  return d.toISOString();
}
