import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldRegisterPluginDebugRoute } from "@/router/modules/plugin";
import {
  shouldRegisterGameRoutes,
  shouldRegisterVueFormDemoRoute,
} from "@/router/modules/manager";
import { shouldRegisterSettingsPeopleRoute } from "@/router/modules/home";

describe("Production URL surface", () => {
  it("does not register debug, demo, unsupported game or empty people routes", () => {
    expect(shouldRegisterPluginDebugRoute(true)).toBe(false);
    expect(shouldRegisterGameRoutes(true)).toBe(false);
    expect(shouldRegisterVueFormDemoRoute(true)).toBe(false);
    expect(shouldRegisterSettingsPeopleRoute(true)).toBe(false);
  });

  it("keeps developer tools available only when explicitly non-Production", () => {
    expect(shouldRegisterPluginDebugRoute(false)).toBe(true);
    expect(shouldRegisterGameRoutes(false)).toBe(true);
    expect(shouldRegisterVueFormDemoRoute(false)).toBe(true);
    expect(shouldRegisterSettingsPeopleRoute(false)).toBe(true);
  });

  it("does not retain the removed Rete Meta navigation target", () => {
    const abilitySource = readFileSync(
      resolve(process.cwd(), "src/utils/ability.ts"),
      "utf8"
    );
    const sceneSource = readFileSync(
      resolve(process.cwd(), "src/views/meta/scene.vue"),
      "utf8"
    );

    expect(abilitySource).not.toContain("/meta/rete-meta");
    expect(sceneSource).not.toContain("/meta/rete-meta");
  });
});
