/**
 * 从 nameI18n 对象中解析当前语言的名称，回退到 name 字段
 *
 * @param name 默认名称（回退值）
 * @param nameI18n 多语言名称映射，如 { "zh-CN": "实用工具", "en-US": "Tools" }
 * @param lang 当前语言标识，如 "zh-CN"、"en-US"
 * @returns 解析后的名称
 */
export function resolveI18nName(
  name: string,
  nameI18n: Record<string, string> | undefined,
  lang: string
): string {
  if (!nameI18n) return name;

  // 精确匹配
  if (nameI18n[lang]) return nameI18n[lang];

  // 语言前缀匹配（如 "zh" 匹配 "zh-CN"）
  const prefix = lang.split("-")[0];
  for (const key of Object.keys(nameI18n)) {
    if (key.startsWith(prefix)) return nameI18n[key];
  }

  return name;
}
