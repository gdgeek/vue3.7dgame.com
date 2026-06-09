export type AuthProvider = "legacy" | "identity";

type RuntimeEnv = Record<string, string | undefined>;

function getRuntimeEnv(): RuntimeEnv {
  if (typeof window === "undefined") {
    return {};
  }

  return (window as unknown as { __ENV__?: RuntimeEnv }).__ENV__ ?? {};
}

export function normalizeAuthProvider(value?: string): AuthProvider {
  const provider = value?.trim().toLowerCase();
  return provider === "identity" ? "identity" : "legacy";
}

export function resolveAuthProvider(): AuthProvider {
  const runtimeEnv = getRuntimeEnv();

  return normalizeAuthProvider(
    runtimeEnv.AUTH_PROVIDER ||
      runtimeEnv.VITE_AUTH_PROVIDER ||
      import.meta.env.VITE_AUTH_PROVIDER
  );
}

export function isIdentityProviderEnabled(): boolean {
  return resolveAuthProvider() === "identity";
}
