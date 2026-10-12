export class SessionSupersededError extends Error {
  constructor() {
    super("The session changed while authentication was in progress.");
  }
}

export function isDefinitiveSessionFailure(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === 401 || status === 403;
}

export function isTransientAuthFailure(error: unknown): boolean {
  if (error instanceof SessionSupersededError) return false;
  const value = error as { response?: { status?: number }; code?: string };
  return (
    !value?.response ||
    [429, 502, 503, 504].includes(value.response.status ?? 0)
  );
}

export function retryDelay(error: unknown, attempt: number): number {
  const headers = (
    error as { response?: { headers?: Record<string, unknown> } }
  )?.response?.headers;
  const raw = headers?.["retry-after"];
  const seconds =
    typeof raw === "string" || typeof raw === "number"
      ? Number(raw)
      : Number.NaN;
  return Number.isFinite(seconds) && seconds >= 0
    ? Math.min(seconds * 1000, 1000)
    : 100 * (attempt + 1);
}
