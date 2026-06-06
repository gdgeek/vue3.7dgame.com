import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import type { UserInfoReturnType } from "@/api/user/model";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  TokenInfo,
} from "@/api/v1/types/auth";
import env from "@/environment";
import Token from "@/store/modules/token";
import { resolveAuthProvider, type AuthProvider } from "./provider";

export type TokenChangedReason =
  | "login"
  | "refresh"
  | "logout"
  | "unauthorized"
  | "wechat"
  | "register"
  | "sso"
  | "external";

export type TokenChangedListener = (
  token: TokenInfo | null,
  context: { reason: TokenChangedReason; provider: AuthProvider }
) => void;

type AuthTokenStore = typeof Token;
type AuthHttpClient = {
  get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>>;
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<AxiosResponse<T>>;
};

export interface AuthClientOptions {
  http?: AuthHttpClient;
  tokenStore?: AuthTokenStore;
  provider?: AuthProvider;
}

function createDefaultHttpClient(): AuthHttpClient {
  return axios.create({
    baseURL: env.api,
    timeout: 50000,
    headers: { "Content-Type": "application/json;charset=utf-8" },
  });
}

function getAccessTokenFromInfo(token: TokenInfo | null): string | null {
  return token?.accessToken || token?.token || null;
}

function buildAuthHeaders(token: TokenInfo | null) {
  const accessToken = getAccessTokenFromInfo(token);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export function createAuthClient(options: AuthClientOptions = {}) {
  const provider = options.provider ?? resolveAuthProvider();
  const http: AuthHttpClient = options.http ?? createDefaultHttpClient();
  const tokenStore = options.tokenStore ?? Token;
  const subscribers = new Set<TokenChangedListener>();
  let refreshPromise: Promise<RefreshTokenResponse> | null = null;

  function notify(token: TokenInfo | null, reason: TokenChangedReason) {
    for (const subscriber of subscribers) {
      subscriber(token, { reason, provider });
    }
  }

  function acceptToken(
    token: TokenInfo,
    reason: TokenChangedReason = "external"
  ) {
    tokenStore.setToken(token);
    notify(token, reason);
    return token;
  }

  function clearToken(reason: TokenChangedReason = "external") {
    tokenStore.removeToken();
    notify(null, reason);
  }

  async function login(data: LoginRequest): Promise<LoginResponse> {
    const response = await http.post<LoginResponse>("/v1/auth/login", data);
    if (response.data?.token) {
      acceptToken(response.data.token, "login");
    }
    return response.data;
  }

  async function refresh(refreshToken?: string): Promise<RefreshTokenResponse> {
    if (refreshPromise) {
      return refreshPromise;
    }

    const tokenToRefresh = refreshToken ?? tokenStore.getToken()?.refreshToken;
    if (!tokenToRefresh) {
      throw new Error("No refresh token available");
    }

    const request = http
      .post<RefreshTokenResponse>("/v1/auth/refresh", {
        refreshToken: tokenToRefresh,
      })
      .then((response) => {
        if (!response.data?.token) {
          throw new Error("Refresh response is missing token");
        }
        acceptToken(response.data.token, "refresh");
        return response.data;
      });

    const sharedRefreshPromise = request.then(
      (result) => {
        Promise.resolve().then(() => {
          refreshPromise = null;
        });
        return result;
      },
      (error) => {
        Promise.resolve().then(() => {
          refreshPromise = null;
        });
        throw error;
      }
    );
    refreshPromise = sharedRefreshPromise;

    return sharedRefreshPromise;
  }

  async function logout(): Promise<void> {
    const token = tokenStore.getToken();
    let logoutError: unknown = null;

    if (token) {
      try {
        await http.post(
          "/v1/auth/logout",
          { refreshToken: token.refreshToken },
          { headers: buildAuthHeaders(token) }
        );
      } catch (error) {
        logoutError = error;
      }
    }

    clearToken("logout");

    if (logoutError) {
      throw logoutError;
    }
  }

  async function getCurrentUser(): Promise<UserInfoReturnType> {
    const response = await http.get<UserInfoReturnType>("/v1/user/info", {
      headers: buildAuthHeaders(tokenStore.getToken()),
    });
    return response.data;
  }

  function getAccessToken(): string | null {
    return getAccessTokenFromInfo(tokenStore.getToken());
  }

  function getTokenInfo(): TokenInfo | null {
    return tokenStore.getToken();
  }

  function getRefreshToken(): string | null {
    return tokenStore.getToken()?.refreshToken ?? null;
  }

  function onTokenChanged(listener: TokenChangedListener) {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }

  return {
    acceptToken,
    clearToken,
    getAccessToken,
    getCurrentUser,
    getRefreshToken,
    getTokenInfo,
    login,
    logout,
    onTokenChanged,
    provider,
    refresh,
  };
}

const authClient = createAuthClient();

export default authClient;
