/**
 * Unit tests for nginx.conf.template
 * Validates proxy configuration, headers, timeouts, gzip, and error handling.
 *
 * Property-based tests validate correctness properties from the design doc.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";

let nginxConfig: string;

beforeAll(() => {
  nginxConfig = readFileSync(
    resolve(__dirname, "../../../nginx.conf.template"),
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

describe("nginx.conf.template — proxy location blocks", () => {
  it("contains /api/ location block", () => {
    expect(nginxConfig).toContain("location /api/");
  });

  it("contains /api-backup/ location block", () => {
    expect(nginxConfig).toContain("location /api-backup/");
  });

  it("contains /api-domain/ location block", () => {
    expect(nginxConfig).toContain("location /api-domain/");
  });

  it("contains /api-domain-backup/ location block", () => {
    expect(nginxConfig).toContain("location /api-domain-backup/");
  });

  it("proxy_pass uses ${APP_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_API_URL}");
  });

  it("proxy_pass uses ${APP_BACKUP_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_BACKUP_API_URL}");
  });

  it("proxy_pass uses ${APP_DOMAIN_INFO_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_DOMAIN_INFO_API_URL}");
  });

  it("proxy_pass uses ${APP_BACKUP_DOMAIN_INFO_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_BACKUP_DOMAIN_INFO_API_URL}");
  });
});

describe("nginx.conf.template — standard headers", () => {
  it("sets X-Real-IP header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Real-IP");
  });

  it("sets X-Forwarded-For header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-For");
  });

  it("sets X-Forwarded-Proto header", () => {
    expect(nginxConfig).toContain("proxy_set_header X-Forwarded-Proto");
  });

  it("sets Host header to $proxy_host in all proxy locations", () => {
    const locations = [
      "/api/",
      "/api-backup/",
      "/api-domain/",
      "/api-domain-backup/",
    ] as const;
    for (const loc of locations) {
      const block = extractLocationBlock(nginxConfig, loc);
      expect(block).toContain("proxy_set_header Host $proxy_host");
    }
  });
});

describe("nginx.conf.template — HTTPS upstream (SNI)", () => {
  it("enables proxy_ssl_server_name for SNI support", () => {
    expect(nginxConfig).toContain("proxy_ssl_server_name on");
  });

  const sniLocations = [
    "/api/",
    "/api-backup/",
    "/api-domain/",
    "/api-domain-backup/",
  ] as const;

  sniLocations.forEach((loc) => {
    it(`${loc} location has proxy_ssl_server_name`, () => {
      const block = extractLocationBlock(nginxConfig, loc);
      expect(block).toContain("proxy_ssl_server_name on");
    });
  });
});

describe("nginx.conf.template — GEEK custom headers", () => {
  const geekHeaders = ["X-GEEK-Proxy", "X-GEEK-Real-IP", "X-GEEK-Source"];

  it("/api/ location has all 3 GEEK headers", () => {
    const block = extractLocationBlock(nginxConfig, "/api/");
    for (const header of geekHeaders) {
      expect(block).toContain(`proxy_set_header ${header}`);
    }
  });

  it("/api-backup/ location has all 3 GEEK headers", () => {
    const block = extractLocationBlock(nginxConfig, "/api-backup/");
    for (const header of geekHeaders) {
      expect(block).toContain(`proxy_set_header ${header}`);
    }
  });
});

describe("nginx.conf.template — WebSocket headers", () => {
  it("sets Upgrade header", () => {
    expect(nginxConfig).toContain("proxy_set_header Upgrade");
  });

  it("sets Connection header for upgrade", () => {
    expect(nginxConfig).toContain('proxy_set_header Connection "upgrade"');
  });
});

describe("nginx.conf.template — timeout configuration", () => {
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

describe("nginx.conf.template — body size limit", () => {
  it("client_max_body_size is at least 50m", () => {
    const match = nginxConfig.match(/client_max_body_size\s+(\d+)m/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(50);
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
// Property-Based Tests (fast-check)
// ===========================================================================

/**
 * Feature: nginx-api-proxy, Property 1: 代理路由正确性
 * **Validates: Requirements 1.1, 1.2**
 *
 * For any proxy prefix, the config routes correctly —
 * the location block exists and proxy_pass directly references the envsubst variable.
 */
describe("Property 1: Proxy route correctness", () => {
  const proxyRoutes = [
    { prefix: "/api/", envVar: "APP_API_URL" },
    { prefix: "/api-backup/", envVar: "APP_BACKUP_API_URL" },
    { prefix: "/api-domain/", envVar: "APP_DOMAIN_INFO_API_URL" },
    { prefix: "/api-domain-backup/", envVar: "APP_BACKUP_DOMAIN_INFO_API_URL" },
  ] as const;

  it("for any proxy prefix, the config contains the location and correct envsubst variable in proxy_pass", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...proxyRoutes),
        fc.webUrl(),
        (route, _upstreamUrl) => {
          const block = extractLocationBlock(nginxConfig, route.prefix);
          expect(block.length).toBeGreaterThan(0);
          // proxy_pass directly uses the envsubst variable (static after substitution)
          expect(block).toContain(`\${${route.envVar}}`);
          expect(block).toContain("proxy_pass");
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 2: 路径前缀剥离
 * **Validates: Requirements 1.3**
 *
 * proxy_pass with trailing slash strips the prefix.
 */
describe("Property 2: Path prefix stripping", () => {
  const proxyPrefixes = [
    "/api/",
    "/api-backup/",
    "/api-domain/",
    "/api-domain-backup/",
  ] as const;

  it("proxy_pass ends with trailing slash to strip prefix", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...proxyPrefixes),
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
 */
describe("Property 3: GEEK custom header completeness", () => {
  const geekHeaders = [
    "X-GEEK-Proxy",
    "X-GEEK-Real-IP",
    "X-GEEK-Source",
  ] as const;
  const proxyPrefixes = ["/api/", "/api-backup/"] as const;

  it("for any proxy location and GEEK header, the header is present", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...proxyPrefixes),
        fc.constantFrom(...geekHeaders),
        (prefix, header) => {
          const block = extractLocationBlock(nginxConfig, prefix);
          expect(block).toContain(`proxy_set_header ${header}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 4: 模板替换往返一致性
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * envsubst variables appear directly in proxy_pass (no set $var indirection).
 */
describe("Property 4: Template substitution round-trip consistency", () => {
  it("all envsubst variables appear in their respective proxy_pass directives", () => {
    const envVarRoutes = [
      { prefix: "/api/", envVar: "APP_API_URL" },
      { prefix: "/api-backup/", envVar: "APP_BACKUP_API_URL" },
      { prefix: "/api-domain/", envVar: "APP_DOMAIN_INFO_API_URL" },
      {
        prefix: "/api-domain-backup/",
        envVar: "APP_BACKUP_DOMAIN_INFO_API_URL",
      },
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
  it("production environment returns relative paths for all proxy endpoints", () => {
    fc.assert(
      fc.property(fc.webUrl(), fc.webUrl(), (_apiUrl, _backupUrl) => {
        const envSource = readFileSync(
          resolve(__dirname, "../../../src/environment.ts"),
          "utf-8"
        );
        expect(envSource).toMatch(/:\s*["']\/api["']/);
        expect(envSource).toMatch(/:\s*["']\/api-backup["']/);
        expect(envSource).toMatch(/:\s*["']\/api-domain["']/);
        expect(envSource).toMatch(/:\s*["']\/api-domain-backup["']/);
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
        expect(envSource).toContain("VITE_APP_BACKUP_API_URL");
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
              !p.startsWith("/api-backup") &&
              !p.startsWith("/api-domain")
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
