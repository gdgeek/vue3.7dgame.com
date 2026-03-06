import { logger } from "@/utils/logger";

/**
 * 安全的 atob 包装函数，对非法 base64 字符串捕获异常并返回 null
 */
export function safeAtob(str: string): string | null {
  try {
    return atob(str);
  } catch {
    logger.warn("[safeAtob] Invalid base64 string");
    return null;
  }
}
