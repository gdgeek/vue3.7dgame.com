import { describe, expect, it } from "vitest";
import {
  buildPluginAccessRequestKey,
  buildTokenFingerprint,
  getTokenAwarePluginAccess,
  isStableAccessState,
  isVisibleForScope,
  normalizeAccessScope,
} from "@/plugin-system/services/pluginAccess";

describe("plugin access helpers", () => {
  it("normalizes missing and invalid access scopes to auth-only", () => {
    expect(normalizeAccessScope(undefined)).toBe("auth-only");
    expect(normalizeAccessScope("")).toBe("auth-only");
  });

  it("preserves valid scoped access values", () => {
    expect(normalizeAccessScope("admin-only")).toBe("admin-only");
    expect(normalizeAccessScope("manager-only")).toBe("manager-only");
    expect(normalizeAccessScope("root-only")).toBe("root-only");
  });

  it("checks visibility for auth-only scopes", () => {
    expect(
      isVisibleForScope("auth-only", { authenticated: true, roles: [] })
    ).toBe(true);
    expect(
      isVisibleForScope("auth-only", { authenticated: false, roles: [] })
    ).toBe(false);
  });

  it("checks visibility for role-scoped plugins", () => {
    expect(
      isVisibleForScope("admin-only", {
        authenticated: true,
        roles: ["admin"],
      })
    ).toBe(true);
    expect(
      isVisibleForScope("manager-only", {
        authenticated: true,
        roles: ["manager"],
      })
    ).toBe(true);
    expect(
      isVisibleForScope("root-only", {
        authenticated: true,
        roles: ["root"],
      })
    ).toBe(true);
    expect(
      isVisibleForScope("root-only", {
        authenticated: true,
        roles: ["admin"],
      })
    ).toBe(false);
  });

  it("builds stable token fingerprints", () => {
    expect(buildTokenFingerprint()).toBe("anonymous");
    expect(buildTokenFingerprint("same-token")).toBe(
      buildTokenFingerprint("same-token")
    );
    expect(buildTokenFingerprint("same-token")).not.toBe(
      buildTokenFingerprint("different-token")
    );
  });

  it("builds plugin access request keys from plugin id and fingerprint", () => {
    expect(buildPluginAccessRequestKey("system-admin", "abc123")).toBe(
      "system-admin:abc123"
    );
  });

  it("identifies only visible and forbidden as stable access states", () => {
    expect(isStableAccessState("visible")).toBe(true);
    expect(isStableAccessState("forbidden")).toBe(true);
    expect(isStableAccessState("unknown")).toBe(false);
    expect(isStableAccessState("loading")).toBe(false);
    expect(isStableAccessState("degraded")).toBe(false);
  });

  it("returns cached access when the cached fingerprint matches the current token", () => {
    expect(
      getTokenAwarePluginAccess(
        {
          pluginAccessScopes: { "system-admin": "root-only" },
          pluginAccessStates: { "system-admin": "visible" },
          pluginPermissionFingerprints: { "system-admin": "abc123" },
        },
        "system-admin",
        "abc123",
        false
      )
    ).toEqual({
      status: "visible",
      accessScope: "root-only",
    });
  });

  it("returns unknown when cached access belongs to a stale token and no request is in flight", () => {
    expect(
      getTokenAwarePluginAccess(
        {
          pluginAccessScopes: { "system-admin": "root-only" },
          pluginAccessStates: { "system-admin": "visible" },
          pluginPermissionFingerprints: { "system-admin": "old-token" },
        },
        "system-admin",
        "current-token",
        false
      )
    ).toEqual({
      status: "unknown",
      accessScope: null,
    });
  });

  it("returns loading when current token has an in-flight access request", () => {
    expect(
      getTokenAwarePluginAccess(
        {
          pluginAccessScopes: { "system-admin": "root-only" },
          pluginAccessStates: { "system-admin": "visible" },
          pluginPermissionFingerprints: { "system-admin": "old-token" },
        },
        "system-admin",
        "current-token",
        true
      )
    ).toEqual({
      status: "loading",
      accessScope: null,
    });
  });
});
