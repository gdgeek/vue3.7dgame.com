/**
 * 生成默认头像 URL
 * 当用户没有设置自定义头像时，使用 DiceBear API 根据 seed 生成唯一头像
 *
 * @param seed - 用于生成头像的种子值（通常是 username 或 id）
 * @param style - DiceBear 头像风格，默认 'bottts-neutral'
 * @returns DiceBear SVG 头像 URL
 */
export function getDefaultAvatarUrl(
  seed: string | number,
  style: "bottts-neutral" | "glass" | "icons" | "thumbs" = "bottts-neutral"
): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

/**
 * 获取用户头像 URL，无自定义头像时返回 DiceBear 默认头像
 *
 * @param avatarUrl - 用户自定义头像 URL（可能为空）
 * @param seed - 用于生成默认头像的种子值
 * @param style - DiceBear 头像风格
 * @returns 头像 URL
 */
export function getUserAvatarUrl(
  avatarUrl: string | null | undefined,
  seed: string | number,
  style: "bottts-neutral" | "glass" | "icons" | "thumbs" = "bottts-neutral"
): string {
  return avatarUrl || getDefaultAvatarUrl(seed, style);
}
