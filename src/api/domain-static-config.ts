const STATIC_DOMAIN_CONFIG_BASE = "/config/domains";
const DEFAULT_DOMAIN = "default";
const DEFAULT_LANGUAGE = "zh-CN";

export interface StaticDomainConfig {
  name: string;
  homepage?: string;
  default_config?: Record<string, unknown>;
  configs?: Record<string, Record<string, unknown>>;
}

export interface StaticDomainQueryResult<T = Record<string, unknown>> {
  domain: string;
  actual_domain: string;
  language: string;
  requested_language: string | null;
  is_fallback: boolean;
  is_domain_fallback: boolean;
  data: T;
}

type ConfigLookup = {
  config: StaticDomainConfig;
  isDomainFallback: boolean;
};

const configCache = new Map<string, Promise<StaticDomainConfig | null>>();

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasConfigData(value: unknown): value is Record<string, unknown> {
  return isObjectRecord(value) && Object.keys(value).length > 0;
}

function isLocalDomain(domain: string): boolean {
  return (
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    /^192\.168\./.test(domain) ||
    /^10\./.test(domain) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(domain)
  );
}

function getStaticDomainCandidates(domain: string): string[] {
  const candidates: string[] = [];
  let candidate = domain;

  while (candidate) {
    candidates.push(candidate);

    const nextDot = candidate.indexOf(".");
    if (nextDot < 0) break;

    const nextCandidate = candidate.slice(nextDot + 1);
    if (!nextCandidate.includes(".")) break;
    candidate = nextCandidate;
  }

  return candidates;
}

export function normalizeStaticDomainName(domain?: string): string {
  let normalized =
    domain ||
    (typeof window !== "undefined" ? window.location.hostname : DEFAULT_DOMAIN);

  normalized = normalized.trim();

  if (!normalized) {
    return DEFAULT_DOMAIN;
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+\-.]*:\/\//i.test(normalized)
        ? normalized
        : `https://${normalized}`
    );
    normalized = url.hostname;
  } catch {
    normalized = normalized
      .replace(/^[a-z][a-z\d+\-.]*:\/\//i, "")
      .split("/")[0]
      .split(":")[0];
  }

  normalized = normalized.trim().toLowerCase();

  if (isLocalDomain(normalized)) {
    return import.meta.env.VITE_APP_DEV_DOMAIN_FALLBACK || normalized;
  }

  return normalized || DEFAULT_DOMAIN;
}

function normalizeStaticConfig(
  raw: unknown,
  requestedName: string
): StaticDomainConfig | null {
  if (!isObjectRecord(raw)) {
    return null;
  }

  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().toLowerCase()
      : requestedName;

  return {
    name,
    ...(typeof raw.homepage === "string" ? { homepage: raw.homepage } : {}),
    default_config: isObjectRecord(raw.default_config)
      ? raw.default_config
      : {},
    configs: isObjectRecord(raw.configs)
      ? (Object.fromEntries(
          Object.entries(raw.configs).filter(([, value]) =>
            isObjectRecord(value)
          )
        ) as Record<string, Record<string, unknown>>)
      : {},
  };
}

async function loadStaticConfigByExactName(
  domain: string
): Promise<StaticDomainConfig | null> {
  const normalized = domain;

  if (!configCache.has(normalized)) {
    const configPromise = (async () => {
      if (typeof fetch !== "function") {
        return null;
      }

      try {
        const response = await fetch(
          `${STATIC_DOMAIN_CONFIG_BASE}/${encodeURIComponent(normalized)}.json`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );

        if (!response.ok) {
          return null;
        }

        return normalizeStaticConfig(await response.json(), normalized);
      } catch {
        return null;
      }
    })();

    configCache.set(normalized, configPromise);
  }

  return configCache.get(normalized)!;
}

async function loadStaticConfig(
  domain: string
): Promise<StaticDomainConfig | null> {
  const normalized = normalizeStaticDomainName(domain);
  for (const candidate of getStaticDomainCandidates(normalized)) {
    const config = await loadStaticConfigByExactName(candidate);
    if (config) {
      return config;
    }
  }

  return null;
}

async function loadCurrentOrDefault(
  requestedDomain: string
): Promise<ConfigLookup | null> {
  const currentConfig = await loadStaticConfig(requestedDomain);

  if (currentConfig) {
    return {
      config: currentConfig,
      isDomainFallback: currentConfig.name !== requestedDomain,
    };
  }

  if (requestedDomain === DEFAULT_DOMAIN) {
    return null;
  }

  const defaultConfig = await loadStaticConfig(DEFAULT_DOMAIN);
  if (!defaultConfig) {
    return null;
  }

  return {
    config: defaultConfig,
    isDomainFallback: true,
  };
}

function makeDefaultResult(
  requestedDomain: string,
  lookup: ConfigLookup
): StaticDomainQueryResult {
  return {
    domain: requestedDomain,
    actual_domain: lookup.config.name,
    language: "default",
    requested_language: null,
    is_fallback: false,
    is_domain_fallback: lookup.isDomainFallback,
    data: {
      ...(lookup.config.default_config || {}),
      ...(typeof lookup.config.homepage === "string"
        ? { homepage: lookup.config.homepage }
        : {}),
    },
  };
}

function makeLanguageResult(
  requestedDomain: string,
  requestedLanguage: string,
  lookup: ConfigLookup,
  actualLanguage: string,
  data: Record<string, unknown>
): StaticDomainQueryResult {
  return {
    domain: requestedDomain,
    actual_domain: lookup.config.name,
    language: actualLanguage,
    requested_language: requestedLanguage,
    is_fallback: actualLanguage !== requestedLanguage,
    is_domain_fallback: lookup.isDomainFallback,
    data,
  };
}

export async function getStaticDomainDefault(
  domain?: string
): Promise<StaticDomainQueryResult | null> {
  const requestedDomain = normalizeStaticDomainName(domain);
  const currentLookup = await loadCurrentOrDefault(requestedDomain);

  if (!currentLookup) {
    return null;
  }

  if (
    typeof currentLookup.config.homepage === "string" ||
    hasConfigData(currentLookup.config.default_config) ||
    currentLookup.config.name === DEFAULT_DOMAIN
  ) {
    return makeDefaultResult(requestedDomain, currentLookup);
  }

  const defaultConfig = await loadStaticConfig(DEFAULT_DOMAIN);
  if (!defaultConfig) {
    return null;
  }

  return makeDefaultResult(requestedDomain, {
    config: defaultConfig,
    isDomainFallback: true,
  });
}

export async function getStaticDomainLanguage(
  domain?: string,
  lang?: string
): Promise<StaticDomainQueryResult | null> {
  const requestedDomain = normalizeStaticDomainName(domain);
  const requestedLanguage = lang || DEFAULT_LANGUAGE;
  const currentLookup = await loadCurrentOrDefault(requestedDomain);

  if (!currentLookup) {
    return null;
  }

  const requestedConfig = currentLookup.config.configs?.[requestedLanguage];
  if (hasConfigData(requestedConfig)) {
    return makeLanguageResult(
      requestedDomain,
      requestedLanguage,
      currentLookup,
      requestedLanguage,
      requestedConfig
    );
  }

  const defaultLanguageConfig =
    requestedLanguage === DEFAULT_LANGUAGE
      ? undefined
      : currentLookup.config.configs?.[DEFAULT_LANGUAGE];
  if (hasConfigData(defaultLanguageConfig)) {
    return makeLanguageResult(
      requestedDomain,
      requestedLanguage,
      currentLookup,
      DEFAULT_LANGUAGE,
      defaultLanguageConfig
    );
  }

  if (currentLookup.config.name === DEFAULT_DOMAIN) {
    return null;
  }

  const defaultConfig = await loadStaticConfig(DEFAULT_DOMAIN);
  if (!defaultConfig) {
    return null;
  }

  const fallbackLookup = {
    config: defaultConfig,
    isDomainFallback: true,
  };
  const fallbackRequestedConfig = defaultConfig.configs?.[requestedLanguage];
  if (hasConfigData(fallbackRequestedConfig)) {
    return makeLanguageResult(
      requestedDomain,
      requestedLanguage,
      fallbackLookup,
      requestedLanguage,
      fallbackRequestedConfig
    );
  }

  const fallbackDefaultConfig =
    requestedLanguage === DEFAULT_LANGUAGE
      ? undefined
      : defaultConfig.configs?.[DEFAULT_LANGUAGE];
  if (hasConfigData(fallbackDefaultConfig)) {
    return makeLanguageResult(
      requestedDomain,
      requestedLanguage,
      fallbackLookup,
      DEFAULT_LANGUAGE,
      fallbackDefaultConfig
    );
  }

  return null;
}

export function clearStaticDomainConfigCache() {
  configCache.clear();
}
