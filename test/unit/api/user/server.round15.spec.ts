import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("src/api/user/server.ts round15", () => {
  let request: ReturnType<typeof vi.fn>;
  let bindEmail: typeof import("@/api/user/server").bindEmail;
  let resetPassword: typeof import("@/api/user/server").resetPassword;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: { ok: true } });
    ({ bindEmail, resetPassword } = await import("@/api/user/server"));
  });

  it("bindEmail uses POST", async () => {
    await bindEmail("a@b.com");
    expect(request.mock.calls[0][0].method).toBe("post");
  });

  it("bindEmail hits bind-email endpoint", async () => {
    await bindEmail("a@b.com");
    expect(request.mock.calls[0][0].url).toBe("/v1/servers/bind-email");
  });

  it("bindEmail sends email payload", async () => {
    await bindEmail("a@b.com");
    expect(request.mock.calls[0][0].data).toEqual({ email: "a@b.com" });
  });

  it("bindEmail returns request result", async () => {
    request.mockResolvedValue({ data: { id: 1 } });
    await expect(bindEmail("x@y.com")).resolves.toEqual({ data: { id: 1 } });
  });

  it("resetPassword uses POST", async () => {
    await resetPassword("old", "new");
    expect(request.mock.calls[0][0].method).toBe("post");
  });

  it("resetPassword hits reset-password endpoint", async () => {
    await resetPassword("old", "new");
    expect(request.mock.calls[0][0].url).toBe("/v1/servers/reset-password");
  });

  it("resetPassword sends old/new password payload", async () => {
    await resetPassword("old1", "new1");
    expect(request.mock.calls[0][0].data).toEqual({
      oldPassword: "old1",
      password: "new1",
    });
  });

  it("resetPassword propagates request rejection", async () => {
    request.mockRejectedValue(new Error("bad request"));
    await expect(resetPassword("o", "n")).rejects.toThrow("bad request");
  });
});
