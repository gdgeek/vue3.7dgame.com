import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import type { UserInfoReturnType } from "@/api/user/model";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  TokenInfo,
} from "@/api/v1/types/auth";
import env from "@/environment";
import { signalSensitiveRuntimeActivity } from "@/services/security/sensitiveRuntimeActivity";
import Token from "@/store/modules/token";
import { resolveAuthProvider, type AuthProvider } from "./provider";
import {
  createSessionCoordinator,
  type SessionCoordinator,
} from "./sessionCoordinator";
import {
  isTransientAuthFailure,
  retryDelay,
  SessionSupersededError,
} from "./sessionErrors";

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
  authHttp?: AuthHttpClient;
  mainHttp?: AuthHttpClient;
  tokenStore?: AuthTokenStore;
  provider?: AuthProvider;
  oidcBridge?: Partial<OidcBridgeConfig>;
  coordinator?: SessionCoordinator;
}

export interface OidcBridgeConfig {
  enabled: boolean;
  clientId: string;
  redirectUri: string;
  scope: string;
}

interface OidcAuthorizationResponse {
  code: string;
  state?: string | null;
  redirect_uri?: string;
}

interface OidcTokenResponse {
  access_token: string;
  token_type: "Bearer" | string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

function createDefaultHttpClient(baseURL: string): AuthHttpClient {
  return axios.create({
    baseURL,
    timeout: 50000,
    headers: { "Content-Type": "application/json;charset=utf-8" },
  });
}

function getAccessTokenFromInfo(token: TokenInfo | null): string | null {
  return token?.accessToken || token?.token || null;
}

function tokenSubject(token: TokenInfo | null): string | null {
  try {
    const encoded = (getAccessTokenFromInfo(token) || "").split(".")[1];
    const value = JSON.parse(
      atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const subject = value.uid ?? value.sub;
    return typeof subject === "number" || typeof subject === "string"
      ? String(subject)
      : null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(token: TokenInfo | null) {
  const accessToken = getAccessTokenFromInfo(token);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export function createAuthClient(options: AuthClientOptions = {}) {
  const provider = options.provider ?? resolveAuthProvider();
  const mainHttp: AuthHttpClient =
    options.mainHttp ?? options.http ?? createDefaultHttpClient(env.api);
  const authHttp: AuthHttpClient =
    options.authHttp ??
    (provider === "identity"
      ? createDefaultHttpClient(env.authApi || "/api-auth")
      : mainHttp);
  const tokenStore = options.tokenStore ?? Token;
  const oidcBridge: OidcBridgeConfig = {
    ...env.oidcBridge,
    ...options.oidcBridge,
  };
  const subscribers = new Set<TokenChangedListener>();
  const coordinator =
    options.coordinator ?? createSessionCoordinator(!options.tokenStore);
  let refreshRequest: {
    credential: string;
    epoch: string;
    promise: Promise<RefreshTokenResponse>;
  } | null = null;

  function notify(token: TokenInfo | null, reason: TokenChangedReason) {
    for (const subscriber of subscribers) {
      subscriber(token, { reason, provider });
    }
  }

  function acceptToken(
    token: TokenInfo,
    reason: TokenChangedReason = "external",
    expectedEpoch?: string
  ) {
    signalSensitiveRuntimeActivity();
    if (expectedEpoch !== undefined) assertCurrent(expectedEpoch);
    else if (reason !== "refresh") coordinator.advanceEpoch();
    return commitToken(token, reason);
  }

  function commitToken(token: TokenInfo, reason: TokenChangedReason) {
    tokenStore.setToken(token);
    coordinator.changed();
    notify(token, reason);
    return token;
  }

  function clearToken(reason: TokenChangedReason = "external") {
    signalSensitiveRuntimeActivity();
    coordinator.advanceEpoch();
    tokenStore.removeToken();
    coordinator.changed();
    notify(null, reason);
  }

  async function login(data: LoginRequest): Promise<LoginResponse> {
    signalSensitiveRuntimeActivity();
    const epoch = coordinator.advanceEpoch();
    const response = await authHttp.post<LoginResponse>("/v1/auth/login", data);
    assertCurrent(epoch);
    if (response.data?.token) {
      commitToken(response.data.token, "login");
      const oidcToken = await exchangeOidcBridgeToken(response.data.token);
      assertCurrent(epoch);
      if (oidcToken) {
        response.data.token = oidcToken;
        commitToken(oidcToken, "login");
      }
    }
    return response.data;
  }

  async function exchangeOidcBridgeToken(
    identityToken: TokenInfo
  ): Promise<TokenInfo | null> {
    if (
      provider !== "identity" ||
      !oidcBridge.enabled ||
      !oidcBridge.clientId ||
      !oidcBridge.redirectUri
    ) {
      return null;
    }

    try {
      const codeVerifier = generatePkceVerifier();
      const codeChallenge = await generatePkceChallenge(codeVerifier);
      const state = generatePkceVerifier().slice(0, 32);
      signalSensitiveRuntimeActivity();
      const authorization = await authHttp.get<OidcAuthorizationResponse>(
        "/authorize",
        {
          headers: buildAuthHeaders(identityToken),
          params: {
            response_type: "code",
            response_mode: "json",
            client_id: oidcBridge.clientId,
            redirect_uri: oidcBridge.redirectUri,
            scope: oidcBridge.scope,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          },
        }
      );

      if (!authorization.data?.code) {
        return null;
      }

      signalSensitiveRuntimeActivity();
      const token = await authHttp.post<OidcTokenResponse>("/token", {
        grant_type: "authorization_code",
        client_id: oidcBridge.clientId,
        redirect_uri: oidcBridge.redirectUri,
        code: authorization.data.code,
        code_verifier: codeVerifier,
      });

      if (!token.data?.access_token) {
        return null;
      }

      return {
        token: token.data.access_token,
        accessToken: token.data.access_token,
        refreshToken: token.data.refresh_token ?? identityToken.refreshToken,
        expires: new Date(
          Date.now() + Math.max(0, token.data.expires_in ?? 0) * 1000
        ).toISOString(),
        tokenType: token.data.token_type,
      };
    } catch (error) {
      console.warn(
        "[auth] OIDC bridge failed; keeping identity login token",
        error
      );
      return null;
    }
  }

  async function refresh(refreshToken?: string): Promise<RefreshTokenResponse> {
    signalSensitiveRuntimeActivity();
    const tokenToRefresh = refreshToken ?? tokenStore.getToken()?.refreshToken;
    if (!tokenToRefresh) {
      throw new Error("No refresh token available");
    }
    if (
      refreshRequest?.credential === tokenToRefresh &&
      refreshRequest.epoch === coordinator.epoch()
    ) {
      return refreshRequest.promise;
    }
    const explicitSwitch =
      refreshToken !== undefined &&
      refreshToken !== tokenStore.getToken()?.refreshToken;
    const epoch = explicitSwitch
      ? coordinator.advanceEpoch()
      : coordinator.epoch();
    const promise = coordinator.lock(async () => {
      assertCurrent(epoch);
      const current = tokenStore.getToken();
      // Another tab may have completed the same rotation while we waited for its lock.
      if (
        !explicitSwitch &&
        current?.refreshToken &&
        current.refreshToken !== tokenToRefresh
      ) {
        notify(current, "refresh");
        return { token: current };
      }
      const requestId = globalThis.crypto.randomUUID();
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await authHttp.post<RefreshTokenResponse>(
            "/v1/auth/refresh",
            {
              refreshToken: tokenToRefresh,
            },
            {
              headers: { "Idempotency-Key": requestId },
              timeout: 5000,
            }
          );
          assertCurrent(epoch);
          if (!response.data?.token) {
            throw new Error("Refresh response is missing token");
          }
          commitToken(response.data.token, explicitSwitch ? "sso" : "refresh");
          return response.data;
        } catch (error) {
          assertCurrent(epoch);
          if (attempt >= 1 || !isTransientAuthFailure(error)) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay(error, attempt))
          );
          assertCurrent(epoch);
        }
      }
    });
    refreshRequest = { credential: tokenToRefresh, epoch, promise };
    void promise
      .finally(() => {
        if (refreshRequest?.promise === promise) refreshRequest = null;
      })
      .catch(() => undefined);
    return promise;
  }

  function assertCurrent(epoch: string) {
    if (epoch !== coordinator.epoch()) throw new SessionSupersededError();
  }

  async function logout(): Promise<void> {
    signalSensitiveRuntimeActivity();
    const token = tokenStore.getToken();
    // Invalidate pending login/refresh responses before the revoke request leaves.
    clearToken("logout");
    let logoutError: unknown = null;

    if (token) {
      try {
        await authHttp.post(
          "/v1/auth/logout",
          { refreshToken: token.refreshToken },
          { headers: buildAuthHeaders(token) }
        );
      } catch (error) {
        logoutError = error;
      }
    }

    if (logoutError) {
      throw logoutError;
    }
  }

  async function getCurrentUser(): Promise<UserInfoReturnType> {
    signalSensitiveRuntimeActivity();
    const epoch = coordinator.epoch();
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await mainHttp.get<UserInfoReturnType>(
          "/v1/user/info",
          {
            headers: buildAuthHeaders(tokenStore.getToken()),
          }
        );
        assertCurrent(epoch);
        return response.data;
      } catch (error) {
        assertCurrent(epoch);
        if (attempt >= 1) throw error;
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 && tokenStore.getToken()?.refreshToken)
          await refresh();
        else if (isTransientAuthFailure(error))
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay(error, attempt))
          );
        else throw error;
        assertCurrent(epoch);
      }
    }
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

  const unsubscribeSession = coordinator.subscribe(() =>
    notify(tokenStore.getToken(), "external")
  );

  return {
    acceptToken,
    clearToken,
    getAccessToken,
    getCurrentUser,
    getRefreshToken,
    getSessionEpoch: () => coordinator.epoch(),
    getSubject: () => tokenSubject(tokenStore.getToken()),
    beginSessionChange: () => coordinator.advanceEpoch(),
    getTokenInfo,
    login,
    logout,
    onTokenChanged,
    provider,
    refresh,
    destroy: () => {
      unsubscribeSession();
      coordinator.destroy();
      subscribers.clear();
    },
  };
}

function generatePkceVerifier(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function generatePkceChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const authClient = createAuthClient();

export default authClient;
