import { describe, it, expect } from "vitest";

import { SidebarStatusEnum } from "@/enums/SidebarStatusEnum";

describe("SidebarStatusEnum", () => {
  it("OPENED equals 'opened'", () => {
    expect(SidebarStatusEnum.OPENED).toBe("opened");
  });

  it("CLOSED equals 'closed'", () => {
    expect(SidebarStatusEnum.CLOSED).toBe("closed");
  });

  it("OPENED and CLOSED are different values", () => {
    expect(SidebarStatusEnum.OPENED).not.toBe(SidebarStatusEnum.CLOSED);
  });

  it("both values are strings", () => {
    expect(typeof SidebarStatusEnum.OPENED).toBe("string");
    expect(typeof SidebarStatusEnum.CLOSED).toBe("string");
  });

  it("both values are lowercase", () => {
    expect(SidebarStatusEnum.OPENED).toMatch(/^[a-z]+$/);
    expect(SidebarStatusEnum.CLOSED).toMatch(/^[a-z]+$/);
  });

  it("the set of two values has size 2", () => {
    const set = new Set([SidebarStatusEnum.OPENED, SidebarStatusEnum.CLOSED]);
    expect(set.size).toBe(2);
  });
});
