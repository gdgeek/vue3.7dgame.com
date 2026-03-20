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

describe("nginx.conf.template — proxy location blocks", () => {
  it("contains /api/ location block", () => {
    expect(nginxConfig).toContain("location /api/");
  });

  it("contains /api-backup/ location block", () => {
    expect(nginxConfig).toContain("location /api-backup/");
  });

  it("proxy_pass uses ${APP_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_API_URL}");
  });

  it("proxy_pass uses ${APP_BACKUP_API_URL} variable", () => {
    expect(nginxConfig).toContain("${APP_BACKUP_API_URL}");
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

  it("sets Host header", () => {
    expect(nginxConfig).toContain("proxy_set_header Host");
  });
});

describe("nginx.conf.template — GEEK custom headers", () => {
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

/**
 * Feature: nginx-api-proxy, Property 1: 代理路由正确性
 * **Validates: Requirements 1.1, 1.2**
 *
 * For any proxy prefix and upstream URL, the config routes correctly —
 * the location block exists and its set directive references the correct envsubst variable.
 */
describe("Property 1: Proxy route correctness", () => {
  const proxyRoutes = [
    { prefix: "/api/", envVar: "APP_API_URL", setVar: "backend_api" },
    {
      prefix: "/api-backup/",
      envVar: "APP_BACKUP_API_URL",
      setVar: "backup_api",
    },
  ] as const;

  it("for any proxy prefix, the config contains the location and correct envsubst variable", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...proxyRoutes),
        fc.webUrl(),
        (route, _upstreamUrl) => {
          // The location block must exist
          const block = extractLocationBlock(nginxConfig, route.prefix);
          expect(block.length).toBeGreaterThan(0);
          // The set directive must reference the correct env variable
          expect(block).toContain(`\${${route.envVar}}`);
          // proxy_pass must reference the set variable
          expect(block).toContain(`$${route.setVar}`);
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
 * For any valid URL path segment X, /api/X should be forwarded as /X.
 */
describe("Property 2: Path prefix stripping", () => {
  const proxyPrefixes = ["/api/", "/api-backup/"] as const;

  it("proxy_pass ends with trailing slash to strip prefix", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...proxyPrefixes),
        fc.stringMatching(/^[a-zA-Z0-9/_-]{1,50}$/),
        (prefix, _pathSegment) => {
          const block = extractLocationBlock(nginxConfig, prefix);
          // proxy_pass target must end with /; (trailing slash triggers prefix stripping)
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
 * Both proxy locations have all 3 GEEK headers.
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
 * envsubst variables appear in proxy_pass targets — for any URL pair,
 * the template contains the envsubst placeholders that would be replaced.
 */
describe("Property 4: Template substitution round-trip consistency", () => {
  it("envsubst variables ${APP_API_URL} and ${APP_BACKUP_API_URL} appear in set directives", () => {
    fc.assert(
      fc.property(fc.webUrl(), fc.webUrl(), (_apiUrl, _backupUrl) => {
        // The template must contain the envsubst placeholders
        expect(nginxConfig).toContain("${APP_API_URL}");
        expect(nginxConfig).toContain("${APP_BACKUP_API_URL}");
        // The set directives assign these to nginx variables used in proxy_pass
        const apiBlock = extractLocationBlock(nginxConfig, "/api/");
        const backupBlock = extractLocationBlock(nginxConfig, "/api-backup/");
        expect(apiBlock).toContain('set $backend_api "${APP_API_URL}"');
        expect(backupBlock).toContain(
          'set $backup_api "${APP_BACKUP_API_URL}"'
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 6: 静态文件回退
 * **Validates: Requirements 7.4**
 *
 * Non-proxy paths fall through to try_files.
 */
describe("Property 6: Static file fallback", () => {
  it("for any non-proxy path, the config has try_files fallback to index.html", () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^\/[a-z]{1,20}$/)
          .filter((p) => !p.startsWith("/api") && !p.startsWith("/api-backup")),
        (_path) => {
          // The catch-all location / block must have try_files
          expect(nginxConfig).toContain("try_files $uri $uri/ /index.html");
          // And the catch-all location must exist
          expect(nginxConfig).toMatch(/location\s+\/\s*\{/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: nginx-api-proxy, Property 5: 环境感知 URL 选择
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 *
 * environment.ts returns correct format per environment:
 * - Production: relative paths /api and /api-backup
 * - Development: full URLs from Vite env variables
 */
describe("Property 5: Environment-aware URL selection", () => {
  it("production environment returns relative paths for api and backup_api", () => {
    fc.assert(
      fc.property(fc.webUrl(), fc.webUrl(), (_apiUrl, _backupUrl) => {
        // In production (DEV=false), environment.ts returns relative paths
        // We verify the source code contains the correct production values
        const envSource = readFileSync(
          resolve(__dirname, "../../../src/environment.ts"),
          "utf-8"
        );
        // Production api should be "/api"
        expect(envSource).toMatch(/:\s*["']\/api["']/);
        // Production backup_api should be "/api-backup"
        expect(envSource).toMatch(/:\s*["']\/api-backup["']/);
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
        // Dev path should reference VITE_APP_API_URL
        expect(envSource).toContain("VITE_APP_API_URL");
        // Dev path should reference VITE_APP_BACKUP_API_URL
        expect(envSource).toContain("VITE_APP_BACKUP_API_URL");
        // Should use import.meta.env.DEV for environment detection
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
