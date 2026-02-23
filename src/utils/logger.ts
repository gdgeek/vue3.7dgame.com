/**
 * 统一日志工具
 * 生产环境自动禁用日志输出
 */

const isDev = import.meta.env.MODE === "development";

class Logger {
  private prefix: string;

  constructor(prefix = "") {
    this.prefix = prefix;
  }

  log(...args: unknown[]) {
    if (isDev) {
      console.log(this.prefix ? `[${this.prefix}]` : "", ...args);
    }
  }

  warn(...args: unknown[]) {
    if (isDev) {
      console.warn(this.prefix ? `[${this.prefix}]` : "", ...args);
    }
  }

  error(...args: unknown[]) {
    // error 在生产环境也保留，用于错误追踪
    console.error(this.prefix ? `[${this.prefix}]` : "", ...args);
  }

  info(...args: unknown[]) {
    if (isDev) {
      console.info(this.prefix ? `[${this.prefix}]` : "", ...args);
    }
  }

  debug(...args: unknown[]) {
    if (isDev) {
      console.debug(this.prefix ? `[${this.prefix}]` : "", ...args);
    }
  }
}

// 创建默认实例
export const logger = new Logger();

// 创建带前缀的 logger
export const createLogger = (prefix: string) => new Logger(prefix);

export default logger;
