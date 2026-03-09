export function getDomainForQuery(): string {
  let domain = window.location.hostname;
  if (
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    /^192\.168\./.test(domain) ||
    /^10\./.test(domain) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(domain)
  ) {
    domain = import.meta.env.VITE_APP_DEV_DOMAIN_FALLBACK || domain;
  }
  return domain;
}

export function getDomainStorageKey(key: string): string {
  const domain = getDomainForQuery().replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${key}:${domain}`;
}
