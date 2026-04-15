export function normalizeDevProxyTarget(rawTarget: string): string {
  const target = rawTarget.trim().replace(/\/$/, "");

  if (!/^https?:\/\//i.test(target)) {
    return target;
  }

  try {
    return new URL(target).origin;
  } catch {
    return target;
  }
}
