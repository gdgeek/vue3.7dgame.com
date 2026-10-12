/** Keep the optional bridge out of normal login and navigation bundles. */
export function resolveWebMcpDevEnabled(
  runtimeValue?: string,
  buildValue?: string
) {
  return (runtimeValue || buildValue) === "true";
}

export const webMcpDevEnabled = resolveWebMcpDevEnabled(
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { __ENV__?: Record<string, string> }).__ENV__
        ?.WEBMCP_DEV_ENABLED,
  import.meta.env.VITE_WEBMCP_DEV_ENABLED
);

export const webMcpDevLabel = (locale: string) =>
  locale.startsWith("zh") ? "AI 工具连接" : "AI tool connection";

const identityRevoked = new Set<() => void>();

export function onWebMcpDevIdentityRevoked(listener: () => void) {
  identityRevoked.add(listener);
  return () => identityRevoked.delete(listener);
}

/** Called before awaiting logout, so an open bridge stops immediately. */
export function revokeWebMcpDevIdentity() {
  for (const listener of identityRevoked) listener();
}
