import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDomainManifest,
  DOMAIN_MANIFEST_MAX_BYTES,
  DOMAIN_MANIFEST_MAX_DOMAINS,
  readDomainManifest,
  serializeDomainManifest,
  type DomainConfigSourceFile,
} from "../../../build/vite-plugin-domain-manifest";

const repositoryRoot = process.cwd();

function configSource(
  name: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    name,
    description: `${name} description`,
    is_active: true,
    fallback_domain: null,
    default_config: {},
    configs: {},
    ...overrides,
  });
}

describe("domain manifest pure builder", () => {
  it("sorts entries and inlines the complete original config deterministically", () => {
    const manifest = createDomainManifest([
      {
        fileName: "z.example.json",
        source: configSource("z.example", { future_field: { enabled: true } }),
      },
      {
        fileName: "a.example.json",
        source: configSource("a.example", {
          description: "A domain",
          is_active: false,
        }),
      },
      {
        fileName: "manifest.json",
        source: JSON.stringify({ schemaVersion: 999 }),
      },
      { fileName: "notes.txt", source: "ignored" },
    ]);

    expect(manifest).toEqual({
      schemaVersion: 1,
      domains: [
        expect.objectContaining({
          configKey: "a.example",
          description: "A domain",
          isActive: false,
        }),
        expect.objectContaining({
          configKey: "z.example",
          description: "z.example description",
          isActive: true,
          config: expect.objectContaining({
            future_field: { enabled: true },
          }),
        }),
      ],
    });
    expect(manifest).not.toHaveProperty("generatedAt");
  });

  it.each([
    ["name", 1, 'field "name" must be a string'],
    ["description", null, 'field "description" must be a string'],
    ["is_active", "yes", 'field "is_active" must be a boolean'],
    [
      "fallback_domain",
      false,
      'field "fallback_domain" must be a string or null',
    ],
    ["default_config", [], 'field "default_config" must be an object'],
    ["configs", [], 'field "configs" must be an object'],
  ])("rejects an invalid %s top-level field", (field, value, message) => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", { [field]: value }),
        },
      ])
    ).toThrow(message);
  });

  it("rejects localized configs that are not objects", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "example.com.json",
          source: configSource("example.com", {
            configs: { "zh-CN": "not-an-object" },
          }),
        },
      ])
    ).toThrow('field "configs.zh-CN" must be an object');
  });

  it("rejects filename/config-name drift, duplicate keys, malformed JSON, and empty input", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "file-key.json",
          source: configSource("different-key"),
        },
      ])
    ).toThrow("must exactly match config.name");

    const duplicate: DomainConfigSourceFile = {
      fileName: "same-key.json",
      source: configSource("same-key"),
    };
    expect(() => createDomainManifest([duplicate, duplicate])).toThrow(
      'duplicate config key "same-key"'
    );
    expect(() =>
      createDomainManifest([{ fileName: "broken.json", source: "{" }])
    ).toThrow("cannot parse JSON");
    expect(() =>
      createDomainManifest([{ fileName: "array.json", source: "[]" }])
    ).toThrow("top-level value must be an object");
    expect(() => createDomainManifest([])).toThrow(
      "no domain JSON files found"
    );
  });

  it("rejects invalid configuration keys and non-finite nested numbers", () => {
    expect(() =>
      createDomainManifest([
        {
          fileName: "Bad_Name.json",
          source: configSource("Bad_Name"),
        },
      ])
    ).toThrow("lowercase domain configuration key");

    expect(() =>
      createDomainManifest([
        {
          fileName: "numbers.example.json",
          source: configSource("numbers.example", {
            default_config: { nested: { unsafe: "__NON_FINITE__" } },
          }).replace('"__NON_FINITE__"', "1e400"),
        },
      ])
    ).toThrow("finite JSON number");
  });

  it("enforces the shared manifest count and serialized byte limits", () => {
    const tooMany = Array.from(
      { length: DOMAIN_MANIFEST_MAX_DOMAINS + 1 },
      (_, index) => ({
        fileName: `domain-${index}.example.json`,
        source: configSource(`domain-${index}.example`),
      })
    );
    expect(() => createDomainManifest(tooMany)).toThrow(
      `at most ${DOMAIN_MANIFEST_MAX_DOMAINS}`
    );

    const oversized = createDomainManifest([
      {
        fileName: "large.example.json",
        source: configSource("large.example", {
          default_config: { payload: "x".repeat(DOMAIN_MANIFEST_MAX_BYTES) },
        }),
      },
    ]);
    expect(() => serializeDomainManifest(oversized)).toThrow(
      `maximum is ${DOMAIN_MANIFEST_MAX_BYTES}`
    );
  });
});

describe("checked-in domain catalog contract", () => {
  it("contains every domain JSON exactly once and in key order", () => {
    const directory = resolve(repositoryRoot, "public/config/domains");
    const expectedKeys = readdirSync(directory)
      .filter(
        (fileName) =>
          fileName !== "manifest.json" && extname(fileName) === ".json"
      )
      .map((fileName) => basename(fileName, ".json"))
      .sort();
    const manifest = readDomainManifest(repositoryRoot);

    expect(manifest.domains.map((domain) => domain.configKey)).toEqual(
      expectedKeys
    );
    for (const entry of manifest.domains) {
      const raw = JSON.parse(
        readFileSync(resolve(directory, `${entry.configKey}.json`), "utf8")
      );
      expect(entry.config).toEqual(raw);
      expect(entry.config.name).toBe(entry.configKey);
      expect(entry.description).toBe(entry.config.description);
      expect(entry.isActive).toBe(entry.config.is_active);
    }
  });
});
