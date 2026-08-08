import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  DOMAIN_MANIFEST_FILE_NAME,
  DOMAIN_MANIFEST_PUBLIC_PATH,
  domainManifestJson,
  readDomainManifest,
  serializeDomainManifest,
} from "../../../build/vite-plugin-domain-manifest";

const repositoryRoot = process.cwd();

function functionHook<T extends (...args: never[]) => unknown>(
  hook: T | { handler: T } | undefined
): T {
  if (!hook) throw new Error("missing Vite hook");
  return typeof hook === "function" ? hook : hook.handler;
}

describe("domain manifest Vite contract", () => {
  it("is registered by the main Vite configuration", () => {
    const config = readFileSync(`${repositoryRoot}/vite.config.ts`, "utf8");
    expect(config).toContain(
      'import { domainManifestJson } from "./build/vite-plugin-domain-manifest"'
    );
    expect(config).toContain("domainManifestJson(),");
  });

  it("emits the deterministic manifest at build time", () => {
    const plugin = domainManifestJson();
    functionHook(plugin.configResolved)({ root: repositoryRoot } as never);

    const emitFile = vi.fn();
    functionHook(plugin.generateBundle).call({ emitFile } as never);
    const expectedSource = serializeDomainManifest(
      readDomainManifest(repositoryRoot)
    );

    expect(emitFile).toHaveBeenCalledOnce();
    expect(emitFile).toHaveBeenCalledWith({
      type: "asset",
      fileName: DOMAIN_MANIFEST_FILE_NAME,
      source: expectedSource,
    });
    expect(expectedSource).not.toContain("generatedAt");
  });

  it("serves the development pathname with or without a query", () => {
    const plugin = domainManifestJson();
    functionHook(plugin.configResolved)({ root: repositoryRoot } as never);

    const use = vi.fn();
    functionHook(plugin.configureServer)({
      middlewares: { use },
      config: { logger: { error: vi.fn() } },
    } as never);
    const middleware = use.mock.calls[0]?.[0];
    expect(middleware).toBeTypeOf("function");

    const headers = new Map<string, string>();
    let body = "";
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      end(value: string) {
        body = value;
      },
    };
    const next = vi.fn();
    middleware({ url: DOMAIN_MANIFEST_PUBLIC_PATH }, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual(readDomainManifest(repositoryRoot));

    const queryNext = vi.fn();
    middleware(
      { url: `${DOMAIN_MANIFEST_PUBLIC_PATH}?cache-bust=1` },
      response,
      queryNext
    );
    expect(queryNext).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(body)).toEqual(readDomainManifest(repositoryRoot));

    const otherNext = vi.fn();
    middleware({ url: "/config/domains/other.json" }, response, otherNext);
    expect(otherNext).toHaveBeenCalledOnce();
  });
});
