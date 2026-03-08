import { describe, it, expect } from "vitest";

import zhCN from "@/lang/zh-CN/homepage";

describe("zh-CN homepage lang", () => {
  it("has a homepage key", () => {
    expect(zhCN).toHaveProperty("homepage");
  });

  it("greeting keys are non-empty strings", () => {
    const { greeting } = zhCN.homepage;
    expect(typeof greeting.morning).toBe("string");
    expect(greeting.morning.length).toBeGreaterThan(0);
    expect(typeof greeting.noon).toBe("string");
    expect(typeof greeting.afternoon).toBe("string");
    expect(typeof greeting.evening).toBe("string");
  });

  it("myCreation section has required keys", () => {
    const mc = zhCN.homepage.myCreation;
    for (const key of [
      "title",
      "myPolygen",
      "myPicture",
      "myVideo",
      "myProject",
      "enter",
    ]) {
      expect(typeof (mc as Record<string, string>)[key]).toBe("string");
    }
  });

  it("quickStart section has upload/edit/create sub-sections", () => {
    const qs = zhCN.homepage.quickStart;
    for (const section of ["upload", "edit", "create"] as const) {
      expect(typeof qs[section].title).toBe("string");
      expect(typeof qs[section].desc).toBe("string");
      expect(typeof qs[section].action).toBe("string");
    }
  });

  it("edit section personalData key exists and is a string", () => {
    expect(typeof zhCN.homepage.edit.personalData).toBe("string");
    expect(zhCN.homepage.edit.personalData.length).toBeGreaterThan(0);
  });

  it("account section title key is a non-empty string", () => {
    expect(typeof zhCN.homepage.account.title).toBe("string");
    expect(zhCN.homepage.account.title.length).toBeGreaterThan(0);
  });

  it("announcements title is a non-empty string", () => {
    expect(typeof zhCN.homepage.announcements.title).toBe("string");
    expect(zhCN.homepage.announcements.title.length).toBeGreaterThan(0);
  });

  it("header subtitle is a non-empty string", () => {
    expect(typeof zhCN.homepage.header.subtitle).toBe("string");
    expect(zhCN.homepage.header.subtitle.length).toBeGreaterThan(0);
  });
});
