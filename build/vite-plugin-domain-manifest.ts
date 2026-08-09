import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import type { Plugin } from "vite";

export const DOMAIN_MANIFEST_FILE_NAME = "config/domains/manifest.json";
export const DOMAIN_MANIFEST_PUBLIC_PATH = `/${DOMAIN_MANIFEST_FILE_NAME}`;
export const DOMAIN_MANIFEST_MAX_DOMAINS = 256;
export const DOMAIN_MANIFEST_MAX_BYTES = 1024 * 1024;

const DOMAIN_CONFIG_KEY_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const SUPPORTED_LOCALES = new Set([
  "zh-CN",
  "zh-TW",
  "en-US",
  "ja-JP",
  "th-TH",
]);
const TOP_LEVEL_KEYS = new Set([
  "name",
  "description",
  "is_active",
  "fallback_domain",
  "default_config",
  "configs",
]);
const DEFAULT_CONFIG_KEYS = new Set([
  "blog",
  "homepage",
  "icon",
  "lang",
  "style",
]);
const LOCALIZED_CONFIG_KEYS = new Set([
  "author",
  "description",
  "domain",
  "homepage",
  "keywords",
  "links",
  "title",
]);
const LOCALIZED_REQUIRED_STRING_KEYS = [
  "author",
  "description",
  "domain",
  "keywords",
  "title",
] as const;
const LINK_KEYS = new Set(["name", "url"]);
const SENSITIVE_VALUE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*\S+/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface StaticDomainDefaultConfig {
  blog?: string;
  homepage?: string;
  icon?: string;
  lang?: string;
  style?: number;
}

export interface StaticDomainLink {
  name: string;
  url: string;
}

export interface StaticDomainLocalizedConfig {
  author: string;
  description: string;
  domain: string;
  homepage?: string;
  keywords: string;
  links: StaticDomainLink[];
  title: string;
}

export interface StaticDomainConfig {
  name: string;
  description: string;
  is_active: boolean;
  fallback_domain: string | null;
  default_config: StaticDomainDefaultConfig;
  configs: Record<string, StaticDomainLocalizedConfig>;
}

export interface DomainManifestEntry {
  configKey: string;
  description: string;
  isActive: boolean;
  config: StaticDomainConfig;
}

export interface DomainManifest {
  schemaVersion: 1;
  domains: DomainManifestEntry[];
}

export interface DomainConfigSourceFile {
  fileName: string;
  source: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(fileName: string, message: string): never {
  throw new Error(`[domain-manifest] ${fileName}: ${message}`);
}

function validateAllowedKeys(
  fileName: string,
  path: string,
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>
): void {
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknownKey) {
    validationError(fileName, `field "${path}.${unknownKey}" is not public`);
  }
}

function validatePublicString(
  fileName: string,
  path: string,
  value: unknown
): asserts value is string {
  if (typeof value !== "string") {
    validationError(fileName, `field "${path}" must be a string`);
  }
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    validationError(fileName, `field "${path}" contains a sensitive value`);
  }

  if (/^https?:\/\//i.test(value)) {
    let url: URL | undefined;
    try {
      url = new URL(value);
    } catch {
      // URL syntax remains a runtime concern; only embedded credentials are
      // rejected here so existing relative and hash links stay supported.
    }
    if (url && (url.username || url.password)) {
      validationError(
        fileName,
        `field "${path}" must not contain URL credentials`
      );
    }
  }
}

function validateDefaultConfig(
  fileName: string,
  value: Record<string, unknown>
): asserts value is Record<string, unknown> & StaticDomainDefaultConfig {
  validateAllowedKeys(fileName, "default_config", value, DEFAULT_CONFIG_KEYS);
  for (const key of ["blog", "homepage", "icon", "lang"] as const) {
    if (key in value) {
      validatePublicString(fileName, `default_config.${key}`, value[key]);
    }
  }
  if (
    "style" in value &&
    (typeof value.style !== "number" || !Number.isFinite(value.style))
  ) {
    validationError(fileName, 'field "default_config.style" must be a number');
  }
}

function validateLocalizedConfig(
  fileName: string,
  locale: string,
  value: Record<string, unknown>
): asserts value is Record<string, unknown> & StaticDomainLocalizedConfig {
  const path = `configs.${locale}`;
  validateAllowedKeys(fileName, path, value, LOCALIZED_CONFIG_KEYS);

  for (const key of LOCALIZED_REQUIRED_STRING_KEYS) {
    validatePublicString(fileName, `${path}.${key}`, value[key]);
  }
  if ("homepage" in value) {
    validatePublicString(fileName, `${path}.homepage`, value.homepage);
  }
  if (!Array.isArray(value.links)) {
    validationError(fileName, `field "${path}.links" must be an array`);
  }
  value.links.forEach((link, index) => {
    if (!isObjectRecord(link)) {
      validationError(
        fileName,
        `field "${path}.links[${index}]" must be an object`
      );
    }
    validateAllowedKeys(fileName, `${path}.links[${index}]`, link, LINK_KEYS);
    validatePublicString(fileName, `${path}.links[${index}].name`, link.name);
    validatePublicString(fileName, `${path}.links[${index}].url`, link.url);
  });
}

function validateFiniteNumbers(fileName: string, value: unknown): void {
  const pending: Array<{ path: string; value: unknown }> = [
    { path: "$", value },
  ];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;

    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) {
        validationError(
          fileName,
          `field "${current.path}" must contain a finite JSON number`
        );
      }
      continue;
    }

    if (Array.isArray(current.value)) {
      current.value.forEach((item, index) => {
        pending.push({ path: `${current.path}[${index}]`, value: item });
      });
      continue;
    }

    if (isObjectRecord(current.value)) {
      for (const [key, child] of Object.entries(current.value)) {
        pending.push({ path: `${current.path}.${key}`, value: child });
      }
    }
  }
}

function parseStaticDomainConfig(
  fileName: string,
  source: string
): StaticDomainConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(source) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    return validationError(fileName, `cannot parse JSON (${detail})`);
  }

  if (!isObjectRecord(raw)) {
    return validationError(fileName, "top-level value must be an object");
  }
  validateFiniteNumbers(fileName, raw);
  validateAllowedKeys(fileName, "$", raw, TOP_LEVEL_KEYS);

  const configKey = basename(fileName, extname(fileName));
  if (typeof raw.name !== "string") {
    return validationError(fileName, 'field "name" must be a string');
  }
  if (raw.name !== configKey) {
    return validationError(
      fileName,
      `filename key "${configKey}" must exactly match config.name "${raw.name}"`
    );
  }
  if (raw.name.length > 253 || !DOMAIN_CONFIG_KEY_PATTERN.test(raw.name)) {
    return validationError(
      fileName,
      'field "name" must be a lowercase domain configuration key'
    );
  }
  if (typeof raw.description !== "string") {
    return validationError(fileName, 'field "description" must be a string');
  }
  validatePublicString(fileName, "description", raw.description);
  if (typeof raw.is_active !== "boolean") {
    return validationError(fileName, 'field "is_active" must be a boolean');
  }
  if (raw.fallback_domain !== null && typeof raw.fallback_domain !== "string") {
    return validationError(
      fileName,
      'field "fallback_domain" must be a string or null'
    );
  }
  if (
    typeof raw.fallback_domain === "string" &&
    (raw.fallback_domain.length > 253 ||
      !DOMAIN_CONFIG_KEY_PATTERN.test(raw.fallback_domain))
  ) {
    return validationError(
      fileName,
      'field "fallback_domain" must be a lowercase domain configuration key or null'
    );
  }
  if (!isObjectRecord(raw.default_config)) {
    return validationError(
      fileName,
      'field "default_config" must be an object'
    );
  }
  validateDefaultConfig(fileName, raw.default_config);
  if (!isObjectRecord(raw.configs)) {
    return validationError(fileName, 'field "configs" must be an object');
  }
  const configs: Record<string, StaticDomainLocalizedConfig> = {};
  for (const [locale, localizedConfig] of Object.entries(raw.configs)) {
    if (!SUPPORTED_LOCALES.has(locale)) {
      return validationError(
        fileName,
        `field "configs.${locale}" uses an unsupported locale`
      );
    }
    if (!isObjectRecord(localizedConfig)) {
      return validationError(
        fileName,
        `field "configs.${locale}" must be an object`
      );
    }
    validateLocalizedConfig(fileName, locale, localizedConfig);
    configs[locale] = localizedConfig;
  }

  return {
    name: raw.name,
    description: raw.description,
    is_active: raw.is_active,
    fallback_domain: raw.fallback_domain,
    default_config: raw.default_config,
    configs,
  };
}

/** Pure, deterministic manifest builder used by both Vite hooks and tests. */
export function createDomainManifest(
  files: readonly DomainConfigSourceFile[]
): DomainManifest {
  const domainFiles = files.filter(({ fileName }) => {
    const name = basename(fileName);
    return name !== "manifest.json" && extname(name) === ".json";
  });
  if (domainFiles.length === 0) {
    throw new Error("[domain-manifest] no domain JSON files found");
  }
  if (domainFiles.length > DOMAIN_MANIFEST_MAX_DOMAINS) {
    throw new Error(
      `[domain-manifest] at most ${DOMAIN_MANIFEST_MAX_DOMAINS} domain JSON files are allowed`
    );
  }

  const configKeys = new Set<string>();
  const domains = domainFiles.map(({ fileName, source }) => {
    const config = parseStaticDomainConfig(fileName, source);
    if (configKeys.has(config.name)) {
      return validationError(fileName, `duplicate config key "${config.name}"`);
    }
    configKeys.add(config.name);

    return {
      configKey: config.name,
      description: config.description,
      isActive: config.is_active,
      config,
    } satisfies DomainManifestEntry;
  });

  const configsByKey = new Map(
    domains.map(({ config }) => [config.name, config] as const)
  );
  for (const { config } of domains) {
    const fallback = config.fallback_domain;
    if (!fallback) continue;
    if (fallback === config.name) {
      validationError(
        `${config.name}.json`,
        `fallback_domain must not reference itself`
      );
    }
    if (!configsByKey.has(fallback)) {
      validationError(
        `${config.name}.json`,
        `fallback_domain "${fallback}" does not reference a checked-in config`
      );
    }
  }

  for (const { config } of domains) {
    const chain: string[] = [];
    let current: StaticDomainConfig | undefined = config;
    while (current?.fallback_domain) {
      const repeatedAt = chain.indexOf(current.name);
      if (repeatedAt >= 0) {
        const cycle = [...chain.slice(repeatedAt), current.name].join(" -> ");
        validationError(
          `${config.name}.json`,
          `fallback_domain cycle detected: ${cycle}`
        );
      }
      chain.push(current.name);
      current = configsByKey.get(current.fallback_domain);
    }
  }

  domains.sort((left, right) =>
    left.configKey < right.configKey
      ? -1
      : left.configKey > right.configKey
        ? 1
        : 0
  );
  return { schemaVersion: 1, domains };
}

export function readDomainManifest(root: string): DomainManifest {
  const directory = resolve(root, "public/config/domains");
  const files = readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== "manifest.json" &&
        extname(entry.name) === ".json"
    )
    .map((entry) => ({
      fileName: entry.name,
      source: readFileSync(resolve(directory, entry.name), "utf8"),
    }));

  return createDomainManifest(files);
}

export function serializeDomainManifest(manifest: DomainManifest): string {
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > DOMAIN_MANIFEST_MAX_BYTES) {
    throw new Error(
      `[domain-manifest] serialized manifest is ${bytes} bytes; maximum is ${DOMAIN_MANIFEST_MAX_BYTES}`
    );
  }
  return serialized;
}

export function domainManifestJson(): Plugin {
  let root = process.cwd();
  const render = () => serializeDomainManifest(readDomainManifest(root));

  return {
    name: "vite-plugin-domain-manifest",

    configResolved(config) {
      root = config.root;
    },

    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let pathname: string;
        try {
          pathname = new URL(request.url || "/", "http://vite.local").pathname;
        } catch {
          next();
          return;
        }
        if (pathname !== DOMAIN_MANIFEST_PUBLIC_PATH) {
          next();
          return;
        }

        try {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(render());
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "unknown manifest error";
          server.config.logger.error(message);
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(
            JSON.stringify({ error: "Domain manifest generation failed" })
          );
        }
      });
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: DOMAIN_MANIFEST_FILE_NAME,
        source: render(),
      });
    },
  };
}
