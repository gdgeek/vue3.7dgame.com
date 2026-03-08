import { describe, it, expect } from "vitest";

// DeviceEnum is a const enum — Vite/esbuild emits it as a regular enum object
// so we can import and inspect its values at runtime.
import { DeviceEnum } from "@/enums/DeviceEnum";

describe("DeviceEnum", () => {
  it("DESKTOP equals 'desktop'", () => {
    expect(DeviceEnum.DESKTOP).toBe("desktop");
  });

  it("MOBILE equals 'mobile'", () => {
    expect(DeviceEnum.MOBILE).toBe("mobile");
  });

  it("DESKTOP and MOBILE are different values", () => {
    expect(DeviceEnum.DESKTOP).not.toBe(DeviceEnum.MOBILE);
  });

  it("DESKTOP is a string", () => {
    expect(typeof DeviceEnum.DESKTOP).toBe("string");
  });

  it("MOBILE is a string", () => {
    expect(typeof DeviceEnum.MOBILE).toBe("string");
  });

  it("values are lowercase strings", () => {
    expect(DeviceEnum.DESKTOP).toMatch(/^[a-z]+$/);
    expect(DeviceEnum.MOBILE).toMatch(/^[a-z]+$/);
  });
});
