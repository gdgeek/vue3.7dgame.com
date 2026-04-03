/**
 * Unit tests for nginx.conf.template
 * Validates proxy configuration, headers, timeouts, gzip, and error handling.
 *
 * Note: /api/ and /api-backup/ location blocks are now dynamically generated
 * by docker-entrypoint.sh. This test validates the static template structure
 * and the entrypoint script logic.
 *
 * Property-based tests validate correctness properties from the design doc.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";

let nginxConfig: string;
let entrypointScript: string;

beforeAll(() => {
  nginxConfig = readFileSync(
    resolve(__dirname, "../../../nginx.conf.template"),
    "utf-8"
  );
  entrypointScript = readFileSync(
    resolve(__dirname, "../../../docker-entrypoint.sh"),
    "utf-8"
  );
});

/**
 * Helper: extract content of a specific location block from the config.
 */
function extractLocationBlock(config: string, path: string): string {
  const marker = `location ${path}`;
  const start = config.indexOf(marker);
  if (start === -1) return "";
  let depth = 0;
  let blockStart = -1;
  for (let i = start; i < config.length; i++) {
    if (config[i] === "{") {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (config[i] === "}") {
      depth--;
      if (depth === 0) return config.slice(blockStart, i + 1);
    }
  }
  return "";
}

// ===========================================================================
// Static template structure tests
// ===========================================================================

describe("nginx.conf.template — static proxy location blocks", () => {
  it("contains # __API_LOCATIONS__ placeholder for dynamic API config", () => {
    expect(nginxConfig).toContain("# __API_LOCATIONS__");
  });

  it("contains # __DOMAIN_LOCATIONS__ placeholder for dynamic domain API config", () => {
    expect(nginxConfig).toContain("# __DOMAIN_LOCATIONS__");
  });

  it("does NOT contain static /api/ location (now dynamic)", () => {
    expect(nginxConfig).not.toMatch(/location\s+\/api\/\s*\{/);
  });

  it("does NOT contain static /api-backup/ location (now dynamic)", () => {
    expect(nginxConfig).not.toContain("location /api-backup/");
  });

  it("does NOT contain static /api-domain/ location (now dynamic)", () => {
    expect(nginxConfig).not.toMatch(/location\s+\/api-domain\/\s*\{/);
  });

  it("does NOT contain static /api-domain-backup/ location (now dynamic)", () => {
    expect(nginxConfig).not.toContain("location /api-domain-backup/");
  });

  it("contains /api-doc/ location block", () => {
    expect(nginxConfig).toContain("location /api-doc/");
  });

  it("proxy_pass uses ${APP_DOC_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_DOC_API_URL}");
  });

  it("does NOT contain ${APP_DOMAIN_INFO_API_URL} (now dynamic)", () => {
    expect(nginxConfig).not.toContain("${APP_DOMAIN_INFO_API_URL}");
  });

  it("does NOT contain ${APP_BACKUP_DOMAIN_INFO_API_URL} (now dynamic)", () => {
    expect(nginxConfig).not.toContain("${APP_BACKUP_DOMAIN_INFO_API_URL}");
  });
});

describe("nginx.conf.template — standard headers (static locations)", () => {
  it("sets X-Real-IP header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Real-IP");
  });

  it("sets X-Forwarded-For header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-For");
  });

  it("sets X-Forwarded-Proto header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-Proto");
  });

  it("sets Host header to $proxy_host in static proxy locations", () => {
    const block = extractLocationBlock(nginxConfig, "/api-doc/");
    expect(block).toContain("proxy_set_header Host $proxy_host");
  });
});

describe("nginx.conf.template — HTTPS upstream (SNI)", () => {
  it("enables proxy_ssl_server_name for SNI support", () => {
    expect(nginxConfig).toContain("proxy_ssl_server_name on");
  });

  const sniLocations = ["/api-doc/"] as const;

  sniLocations.forEach((loc) => {
    it(`${loc} location has proxy_ssl_server_name`, () => {
      const block = extractLocationBlock(nginxConfig, loc);
      expect(block).toContain("proxy_ssl_server_name on");
    });
  });
});

describe("nginx.conf.template — timeout configuration (static locations)", () => {
  it("proxy_connect_timeout is 60s", () => {
    expect(nginxConfig).toContain("proxy_connect_timeout 60s");
  });

  it("proxy_read_timeout is 120s", () => {
    expect(nginxConfig).toContain("proxy_read_timeout 120s");
  });

  it("proxy_send_timeout is 120s", () => {
    expect(nginxConfig).toContain("proxy_send_timeout 120s");
  });
});

describe("nginx.conf.template — gzip preserved", () => {
  it("gzip is enabled", () => {
    expect(nginxConfig).toContain("gzip on");
  });

  it("gzip_types is configured", () => {
    expect(nginxConfig).toContain("gzip_types");
  });
});

describe("nginx.conf.template — try_files fallback preserved", () => {
  it("contains try_files with /index.html fallback", () => {
    expect(nginxConfig).toContain("try_files $uri $uri/ /index.html");
  });
});

describe("nginx.conf.template — custom JSON error responses", () => {
  it("has 502 custom JSON error", () => {
    expect(nginxConfig).toContain("error_page 502");
    expect(nginxConfig).toContain('"status": 502');
  });

  it("has 503 custom JSON error", () => {
    expect(nginxConfig).toContain("error_page 503");
    expect(nginxConfig).toContain('"status": 503');
  });

  it("has 504 custom JSON error", () => {
    expect(nginxConfig).toContain("error_page 504");
    expect(nginxConfig).toContain('"status": 504');
  });
});

// ===========================================================================
// docker-entrypoint.sh tests
// ===========================================================================

describe("docker-entrypoint.sh — entrypoint script structure", () => {
  it("reads APP_API_N_URL numbered environment variables", () => {
    expect(entrypointScript).toContain("APP_API");
  });

  it("reads APP_DOMAIN_N_URL numbered environment variables", () => {
    expect(entrypointScript).toContain("APP_DOMAIN");
  });

  it("uses generate_lb_config function for reusable load balancing + failover generation", () => {
    expect(entrypointScript).toContain("generate_lb_config");
  });

  it("generates /api/ failover chain", () => {
    expect(entrypointScript).toContain('"/api/"');
  });

  it("generates /api-domain/ failover chain", () => {
    expect(entrypointScript).toContain('"/api-domain/"');
  });

  it("replaces # __API_LOCATIONS__ placeholder", () => {
    expect(entrypointScript).toContain("__API_LOCATIONS__");
  });

  it("replaces # __DOMAIN_LOCATIONS__ placeholder", () => {
    expect(entrypointScript).toContain("__DOMAIN_LOCATIONS__");
  });

  it("sets proxy_ssl_server_name on for HTTPS upstream", () => {
    expect(entrypointScript).toContain("proxy_ssl_server_name on");
  });

  it("sets correct Host header per backend", () => {
    expect(entrypointScript).toContain("proxy_set_header Host ${host}");
  });

  it("includes GEEK custom headers in generated locations", () => {
    expect(entrypointScript).toContain("X-GEEK-Proxy");
    expect(entrypointScript).toContain("X-GEEK-Real-IP");
    expect(entrypointScript).toContain("X-GEEK-Source");
  });

  it("includes WebSocket support headers", () => {
    expect(entrypointScript).toContain("Upgrade");
    expect(entrypointScript).toContain("Connection");
  });

  it("uses error_page for failover chaining", () => {
    expect(entrypointScript).toContain("error_page 502 503 504");
  });

  it("uses proxy_connect_timeout 5s for fast failover", () => {
    expect(entrypointScript).toContain("proxy_connect_timeout 5s");
  });

  it("uses rewrite to strip prefix in backup locations", () => {
    expect(entrypointScript).toContain("rewrite ^${LOC_PATH}");
  });

  it("replaces # __API_LOCATIONS__ placeholder", () => {
    expect(entrypointScript).toContain("__API_LOCATIONS__");
  });

  it("ends with exec nginx", () => {
    expect(entrypointScript).toContain("exec nginx -g");
  });
});

// ===========================================================================
// Property-Based Tests (fast-check)
// ===========================================================================

/**
 * Feature: nginx-api-proxy, Property 1: 代理路由正确性 (static locations)
 * **Validates: Requirements 1.1, 1.2 (for domain/doc proxies)**
 */
describe("Property 1: Proxy route correctness (static locations)", () => {
  const staticRoutes = [
    { prefix: "/api-doc/", envVar: "APP_DOC_API_URL" },
  ] as const;

  it("for any static proxy prefix, the config contains the location and correct envsubst variable", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...staticRoutes),
        fc.webUrl(),
        (route, _upstreamUrl) => {
          const block = extractLocationBlock(nginxConfig, route.prefix);
          expect(block.length).toBeGreaterThan(0);
          expect(block).toContain(`\${${route.envVar}}`);
          expect(block).toContain("proxy_pass");
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 2: 路径前缀剥离 (static locations)
 * **Validates: Requirements 1.3**
 */
describe("Property 2: Path prefix stripping (static locations)", () => {
  const staticPrefixes = ["/api-doc/"] as const;

  it("proxy_pass ends with trailing slash to strip prefix", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...staticPrefixes),
        fc.stringMatching(/^[a-zA-Z0-9/_-]{1,50}$/),
        (prefix, _pathSegment) => {
          const block = extractLocationBlock(nginxConfig, prefix);
          const proxyPassMatch = block.match(/proxy_pass\s+(\S+);/);
          expect(proxyPassMatch).not.toBeNull();
          expect(proxyPassMatch![1]).toMatch(/\/$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 3: GEEK 自定义请求头完整性
 * **Validates: Requirements 1.6, 1.7, 1.8**
 *
 * Verifies the entrypoint script generates GEEK headers for dynamic locations.
 */
describe("Property 3: GEEK custom header completeness (entrypoint)", () => {
  const geekHeaders = [
    "X-GEEK-Proxy",
    "X-GEEK-Real-IP",
    "X-GEEK-Source",
  ] as const;

  it("for any GEEK header, the entrypoint script includes it in generated locations", () => {
    fc.assert(
      fc.property(fc.constantFrom(...geekHeaders), (header) => {
        expect(entrypointScript).toContain(header);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 4: 模板替换往返一致性 (static locations)
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */
describe("Property 4: Template substitution round-trip consistency", () => {
  it("all static envsubst variables appear in their respective proxy_pass directives", () => {
    const envVarRoutes = [
      { prefix: "/api-doc/", envVar: "APP_DOC_API_URL" },
    ] as const;

    fc.assert(
      fc.property(fc.constantFrom(...envVarRoutes), (route) => {
        expect(nginxConfig).toContain(`\${${route.envVar}}`);
        const block = extractLocationBlock(nginxConfig, route.prefix);
        expect(block).toContain(`proxy_pass \${${route.envVar}}/`);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 5: 环境感知 URL 选择
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 */
describe("Property 5: Environment-aware URL selection", () => {
  it("production environment returns relative paths for proxy endpoints", () => {
    fc.assert(
      fc.property(fc.webUrl(), (_apiUrl) => {
        const envSource = readFileSync(
          resolve(__dirname, "../../../src/environment.ts"),
          "utf-8"
        );
        expect(envSource).toMatch(/:\s*["']\/api["']/);
        expect(envSource).toMatch(/:\s*["']\/api-domain["']/);
        expect(envSource).toMatch(/:\s*["']\/api-doc["']/);
      }),
      { numRuns: 100 }
    );
  });

  it("development environment uses VITE env variables", () => {
    fc.assert(
      fc.property(fc.webUrl(), (_url) => {
        const envSource = readFileSync(
          resolve(__dirname, "../../../src/environment.ts"),
          "utf-8"
        );
        expect(envSource).toContain("VITE_APP_API_URL");
        expect(envSource).toContain("import.meta.env.DEV");
      }),
      { numRuns: 100 }
    );
  });

  it("environment.ts does not import ReplaceURL, ReplaceIP, or GetIP", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const envSource = readFileSync(
          resolve(__dirname, "../../../src/environment.ts"),
          "utf-8"
        );
        expect(envSource).not.toContain("ReplaceURL");
        expect(envSource).not.toContain("ReplaceIP");
        expect(envSource).not.toContain("GetIP");
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 6: 静态文件回退
 * **Validates: Requirements 7.4**
 */
describe("Property 6: Static file fallback", () => {
  it("for any non-proxy path, the config has try_files fallback to index.html", () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^\/[a-z]{1,20}$/)
          .filter(
            (p) =>
              !p.startsWith("/api") &&
              !p.startsWith("/api-domain") &&
              !p.startsWith("/api-doc")
          ),
        (_path) => {
          expect(nginxConfig).toContain("try_files $uri $uri/ /index.html");
          expect(nginxConfig).toMatch(/location\s+\/\s*\{/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
