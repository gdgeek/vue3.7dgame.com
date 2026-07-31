import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import type { Plugin } from "vite";

export const DOMAIN_MANIFEST_FILE_NAME = "config/domains/manifest.json";
export const DOMAIN_MANIFEST_PUBLIC_PATH = `/${DOMAIN_MANIFEST_FILE_NAME}`;
export const DOMAIN_MANIFEST_MAX_DOMAINS = 256;
export const DOMAIN_MANIFEST_MAX_BYTES = 1024 * 1024;

const DOMAIN_CONFIG_KEY_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface StaticDomainConfig extends JsonObject {
  name: string;
  description: string;
  is_active: boolean;
  fallback_domain: string | null;
  default_config: JsonObject;
  configs: Record<string, JsonObject>;
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
  if (!isObjectRecord(raw.configs)) {
    return validationError(fileName, 'field "configs" must be an object');
  }
  for (const [locale, localizedConfig] of Object.entries(raw.configs)) {
    if (!isObjectRecord(localizedConfig)) {
      return validationError(
        fileName,
        `field "configs.${locale}" must be an object`
      );
    }
  }

  return raw as StaticDomainConfig;
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
        if (request.url !== DOMAIN_MANIFEST_PUBLIC_PATH) {
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
