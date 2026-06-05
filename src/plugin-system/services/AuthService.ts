import { createLogger } from "@/utils/logger";
import authClient from "@/services/auth/authClient";

const logger = createLogger("AuthService");

/** Pattern matching JWT token prefixes — used to redact tokens from logs */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+/g;

/** Function that removes a subscription when called */
type Unsubscribe = () => void;

/** Callback invoked when the access token changes */
type TokenChangeCallback = (token: string | null) => void;

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
 * AuthService 通过统一 Auth_Client 读取和订阅 Token 变化。
 */
export class AuthService {
  /** Active authClient unsubscribe callbacks */
  private unsubscribers: Set<Unsubscribe> = new Set();

  constructor() {
    logger.info("AuthService initialized");
  }

  /** 获取当前 accessToken */
  getAccessToken(): string | null {
    return authClient.getAccessToken();
  }

  /**
   * 监听 Token 变化
   *
   * 当 accessToken 发生变化时，回调会收到新的 token 值。
   * 返回一个取消订阅函数。首个订阅者注册时启动轮询，
   * 最后一个订阅者取消时停止轮询。
   */
  onTokenChange(callback: TokenChangeCallback): Unsubscribe {
    const unsubscribe = authClient.onTokenChanged((token) => {
      const accessToken = token?.accessToken ?? token?.token ?? null;
      if (accessToken) {
        const safeToken = sanitizeForLog(accessToken);
        logger.info(`Token changed: ${safeToken}`);
      } else {
        logger.info("Token removed");
      }
      callback(accessToken);
    });

    this.unsubscribers.add(unsubscribe);

    return () => {
      unsubscribe();
      this.unsubscribers.delete(unsubscribe);
    };
  }

  /** Token 是否有效（当前是否存在 accessToken） */
  isAuthenticated(): boolean {
    return Boolean(authClient.getAccessToken());
  }

  /** 销毁服务，停止轮询并清理订阅者 */
  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.clear();
    logger.info("AuthService destroyed");
  }
}

export default AuthService;
