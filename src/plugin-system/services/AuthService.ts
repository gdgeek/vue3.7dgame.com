import { createLogger } from "@/utils/logger";
import tokenStore from "@/store/modules/token";

const logger = createLogger("AuthService");

/** Pattern matching JWT token prefixes — used to redact tokens from logs */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+/g;

/** Function that removes a subscription when called */
type Unsubscribe = () => void;

/** Callback invoked when the access token changes */
type TokenChangeCallback = (token: string) => void;

/**
 * Sanitize a value for safe logging by redacting JWT tokens.
 * Replaces any `eyJ…` base64 sequences with `[REDACTED]`.
 */
function sanitizeForLog(value: string): string {
  return value.replace(JWT_PATTERN, "[REDACTED]");
}

/**
 * AuthService — Token 管理服务
 *
 * 封装现有 Token store（`src/store/modules/token.ts`），
 * 为插件系统提供统一的 Token 访问、变化监听和认证状态查询。
 *
 * 由于底层 Token store 基于 SecureLS 且没有内置响应式，
 * AuthService 通过轮询检测 Token 变化并通知订阅者。
 */
export class AuthService {
  /** Active token-change subscribers */
  private subscribers: Set<TokenChangeCallback> = new Set();

  /** Last known accessToken value (used for change detection) */
  private lastAccessToken: string | null = null;

  /** Polling interval handle */
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Polling interval in milliseconds */
  private readonly pollIntervalMs: number;

  constructor(pollIntervalMs = 1000) {
    this.pollIntervalMs = pollIntervalMs;
    this.lastAccessToken = this.readAccessToken();
    logger.info("AuthService initialized");
  }

  /** 获取当前 accessToken */
  getAccessToken(): string | null {
    return this.readAccessToken();
  }

  /**
   * 监听 Token 变化
   *
   * 当 accessToken 发生变化时，回调会收到新的 token 值。
   * 返回一个取消订阅函数。首个订阅者注册时启动轮询，
   * 最后一个订阅者取消时停止轮询。
   */
  onTokenChange(callback: TokenChangeCallback): Unsubscribe {
    this.subscribers.add(callback);

    if (this.subscribers.size === 1) {
      this.startPolling();
    }

    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stopPolling();
      }
    };
  }

  /** Token 是否有效（当前是否存在 accessToken） */
  isAuthenticated(): boolean {
    return tokenStore.hasToken();
  }

  /** 销毁服务，停止轮询并清理订阅者 */
  destroy(): void {
    this.stopPolling();
    this.subscribers.clear();
    logger.info("AuthService destroyed");
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Read the current accessToken from the underlying token store */
  private readAccessToken(): string | null {
    const tokenInfo = tokenStore.getToken();
    return tokenInfo?.accessToken ?? null;
  }

  /** Start the polling timer that checks for token changes */
  private startPolling(): void {
    if (this.pollTimer !== null) return;

    this.pollTimer = setInterval(() => {
      this.checkTokenChange();
    }, this.pollIntervalMs);

    logger.debug("Token polling started");
  }

  /** Stop the polling timer */
  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      logger.debug("Token polling stopped");
    }
  }

  /** Compare current token with last known value and notify subscribers */
  private checkTokenChange(): void {
    const currentToken = this.readAccessToken();

    if (currentToken !== this.lastAccessToken && currentToken !== null) {
      const safeToken = sanitizeForLog(currentToken);
      logger.info(`Token changed: ${safeToken}`);

      this.lastAccessToken = currentToken;
      this.notifySubscribers(currentToken);
    } else if (currentToken === null && this.lastAccessToken !== null) {
      logger.info("Token removed");
      this.lastAccessToken = null;
    }
  }

  /** Notify all subscribers with the new token value */
  private notifySubscribers(token: string): void {
    for (const callback of this.subscribers) {
      try {
        callback(token);
      } catch (err) {
        logger.error("Error in token change subscriber:", err);
      }
    }
  }
}

export default AuthService;
