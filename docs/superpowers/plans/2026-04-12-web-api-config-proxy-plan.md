# Web API Config Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/api-config` to the `web` module, route plugin-related system-admin API traffic through it, and give it the same load-balancing/failover behavior as `/api`.

**Architecture:** Keep `generate_lb_config` as the single source of truth for generated nginx proxy chains, add a third generated chain for `/api-config/`, and switch the system-admin URL builder to read a new runtime base from `environment.ts`. Development keeps direct env-based access because `pnpm dev` runs Vite instead of nginx.

**Tech Stack:** Vite, Vue 3, TypeScript, Vitest, nginx, shell entrypoint generation

---

### Task 1: Lock `/api-config` Expectations In Tests

**Files:**
- Create: `test/unit/plugin-system/systemAdminApi.spec.ts`
- Modify: `test/unit/nginx/nginx-config.spec.ts`
- Modify: `test/unit/nginx/docker-compose.spec.ts`

- [ ] **Step 1: Write the failing URL-builder test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("systemAdminApi", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/environment");
  });

  it("builds plugin API URLs from the /api-config runtime base", async () => {
    vi.doMock("@/environment", () => ({
      default: { config_api: "/api-config" },
    }));

    const { buildSystemAdminUrl } = await import(
      "@/plugin-system/services/systemAdminApi"
    );

    expect(buildSystemAdminUrl("/v1/plugin/list")).toBe(
      "/api-config/v1/plugin/list"
    );
  });
});
```

- [ ] **Step 2: Add failing nginx and compose assertions**

```ts
it("contains # __CONFIG_LOCATIONS__ placeholder for dynamic config API", () => {
  expect(nginxConfig).toContain("# __CONFIG_LOCATIONS__");
});

it("generates /api-config/ failover chain", () => {
  expect(entrypointScript).toContain('"/api-config/"');
  expect(entrypointScript).toContain("APP_CONFIG");
});

it("contains APP_CONFIG_1_URL (primary config backend)", () => {
  expect(composeConfig).toContain("APP_CONFIG_1_URL=");
});
```

- [ ] **Step 3: Run the focused tests to verify RED**

Run: `pnpm vitest run test/unit/plugin-system/systemAdminApi.spec.ts test/unit/nginx/nginx-config.spec.ts test/unit/nginx/docker-compose.spec.ts`

Expected:
- `systemAdminApi.spec.ts` fails because the runtime builder still uses the old direct env variable.
- nginx tests fail because `/api-config` placeholders and generated chain are missing.
- compose tests fail because `APP_CONFIG_*` is not present yet.

### Task 2: Switch The Runtime URL Builder To The New Config Base

**Files:**
- Modify: `src/environment.ts`
- Modify: `src/plugin-system/services/systemAdminApi.ts`
- Modify: `.env.development`
- Modify: `.env.production`
- Modify: `.env.staging`

- [ ] **Step 1: Add `config_api` to the runtime environment map**

```ts
const environment = {
  api: import.meta.env.DEV ? import.meta.env.VITE_APP_API_URL || "" : "/api",
  config_api: import.meta.env.DEV
    ? import.meta.env.VITE_APP_CONFIG_API_URL || ""
    : "/api-config",
  doc: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOC_API || ""
    : "/api-doc",
  domain_info: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOMAIN_INFO_API_URL || ""
    : "/api-domain",
};
```

- [ ] **Step 2: Make `buildSystemAdminUrl()` read `environment.config_api`**

```ts
import environment from "@/environment";

const SYSTEM_ADMIN_API_BASE = (environment.config_api || "").replace(/\/$/, "");

export function buildSystemAdminUrl(path: string): string {
  return `${SYSTEM_ADMIN_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
```

- [ ] **Step 3: Replace the old direct env in all web env files**

```dotenv
VITE_APP_CONFIG_API_URL="http://localhost:8088/api"
```

```dotenv
VITE_APP_CONFIG_API_URL="/api-config"
```

```dotenv
VITE_APP_CONFIG_API_URL="{scheme}//system-admin.plugins.{domain}/backend/api"
```

- [ ] **Step 4: Run the focused runtime tests**

Run: `pnpm vitest run test/unit/plugin-system/systemAdminApi.spec.ts test/unit/plugin-system/ConfigService.spec.ts`

Expected:
- `systemAdminApi.spec.ts` passes with `/api-config`.
- `ConfigService.spec.ts` stays green because it still uses `buildSystemAdminUrl()` transparently.

### Task 3: Add `/api-config` To Generated Nginx Proxy Chains

**Files:**
- Modify: `nginx.conf.template`
- Modify: `docker-entrypoint.sh`
- Modify: `docker-compose.prod.yml`
- Modify: `docker-compose.test.yml`

- [ ] **Step 1: Add the config proxy placeholder to the template**

```nginx
    # ============ 反向代理 - 配置 API (由 docker-entrypoint.sh 动态生成) ============
    # __CONFIG_LOCATIONS__
```

- [ ] **Step 2: Reuse `generate_lb_config` for `/api-config/` with `/api/` semantics**

```sh
generate_lb_config "APP_API" "/api/" "api" "yes"
API_LOCATIONS="$CHAIN_RESULT"

generate_lb_config "APP_CONFIG" "/api-config/" "config" "yes"
CONFIG_LOCATIONS="$CHAIN_RESULT"

generate_lb_config "APP_DOMAIN" "/api-domain/" "domain" "no"
DOMAIN_LOCATIONS="$CHAIN_RESULT"
```

```sh
inject_locations "# __API_LOCATIONS__" "$API_LOCATIONS"
inject_locations "# __CONFIG_LOCATIONS__" "$CONFIG_LOCATIONS"
inject_locations "# __DOMAIN_LOCATIONS__" "$DOMAIN_LOCATIONS"
```

- [ ] **Step 3: Add numbered config backends to the compose examples**

```yaml
      - APP_CONFIG_1_URL=https://system-admin.plugins.xrugc.com/backend/api
      - APP_CONFIG_2_URL=https://system-admin-backup.plugins.xrugc.com/backend/api
```

- [ ] **Step 4: Run the proxy tests**

Run: `pnpm vitest run test/unit/nginx/nginx-config.spec.ts test/unit/nginx/docker-compose.spec.ts test/unit/nginx/dockerfile.spec.ts`

Expected:
- nginx and compose tests pass with the new config placeholder and config backends.

### Task 4: Run Final Verification For This Change Set

**Files:**
- Verify only

- [ ] **Step 1: Run the exact regression suite for this feature**

Run: `pnpm vitest run test/unit/plugin-system/systemAdminApi.spec.ts test/unit/plugin-system/ConfigService.spec.ts test/unit/nginx/nginx-config.spec.ts test/unit/nginx/docker-compose.spec.ts test/unit/nginx/dockerfile.spec.ts`

Expected:
- All targeted tests PASS.

- [ ] **Step 2: Confirm the old direct env variable no longer drives the web source**

Run: `rg -n "VITE_SYSTEM_ADMIN_API_URL" src .env.* test`

Expected:
- No match in `src/`
- Env files either migrated or intentionally absent from runtime code paths

- [ ] **Step 3: Review the final diff**

Run: `git diff -- src/environment.ts src/plugin-system/services/systemAdminApi.ts .env.development .env.production .env.staging nginx.conf.template docker-entrypoint.sh docker-compose.prod.yml docker-compose.test.yml test/unit/plugin-system/systemAdminApi.spec.ts test/unit/nginx/nginx-config.spec.ts test/unit/nginx/docker-compose.spec.ts`

Expected:
- Diff contains only the planned `/api-config` runtime, proxy, and test changes
