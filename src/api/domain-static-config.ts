const STATIC_DOMAIN_CONFIG_BASE = "/config/domains";
const DEFAULT_DOMAIN = "default";
const DEFAULT_LANGUAGE = "zh-CN";

export interface StaticDomainConfig {
  name: string;
  description?: string;
  is_active?: boolean;
  fallback_domain?: string | null;
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

  const addDomainAndParents = (domainName: string) => {
    let candidate = domainName;

    while (candidate) {
      candidates.push(candidate);

      const nextDot = candidate.indexOf(".");
      if (nextDot < 0) {
        break;
      }

      const nextCandidate = candidate.slice(nextDot + 1);
      if (!nextCandidate.includes(".")) {
        break;
      }

      candidate = nextCandidate;
    }
  };

  const publicDomain = domain.startsWith("www.") ? domain.slice(4) : domain;
  if (publicDomain.startsWith("d.")) {
    addDomainAndParents(publicDomain.slice(2));
  }

  if (domain.startsWith("www.")) {
    addDomainAndParents(domain.slice(4));
  }

  addDomainAndParents(domain);

  return [...new Set(candidates.filter(Boolean))];
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
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : undefined,
    fallback_domain:
      typeof raw.fallback_domain === "string" && raw.fallback_domain.trim()
        ? raw.fallback_domain.trim().toLowerCase()
        : null,
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

async function loadFallbackConfig(
  config: StaticDomainConfig
): Promise<StaticDomainConfig | null> {
  if (!config.fallback_domain) {
    return null;
  }

  const fallbackDomain = normalizeStaticDomainName(config.fallback_domain);

  if (!fallbackDomain || fallbackDomain === config.name) {
    return null;
  }

  const fallbackConfig = await loadStaticConfig(fallbackDomain);
  if (!fallbackConfig || fallbackConfig.is_active === false) {
    return null;
  }

  return fallbackConfig;
}

async function loadCurrentOrDefault(
  requestedDomain: string
): Promise<ConfigLookup | null> {
  const currentConfig = await loadStaticConfig(requestedDomain);

  if (currentConfig?.is_active === false) {
    return null;
  }

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
  if (!defaultConfig || defaultConfig.is_active === false) {
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
    data: lookup.config.default_config || {},
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

  if (hasConfigData(currentLookup.config.default_config)) {
    return makeDefaultResult(requestedDomain, currentLookup);
  }

  const fallbackConfig = await loadFallbackConfig(currentLookup.config);
  if (!fallbackConfig || !hasConfigData(fallbackConfig.default_config)) {
    return null;
  }

  return makeDefaultResult(requestedDomain, {
    config: fallbackConfig,
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

  const fallbackConfig = await loadFallbackConfig(currentLookup.config);
  if (!fallbackConfig) {
    return null;
  }

  const fallbackLookup = {
    config: fallbackConfig,
    isDomainFallback: true,
  };
  const fallbackRequestedConfig = fallbackConfig.configs?.[requestedLanguage];
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
      : fallbackConfig.configs?.[DEFAULT_LANGUAGE];
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
