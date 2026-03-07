import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/environment", () => ({
  default: { email_api: "https://email.example.com", password_api: "https://password.example.com" },
}));

describe("api/v1/password", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/password");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    api = await import("@/api/v1/password");
  });

  it("requestPasswordReset calls request-reset endpoint", async () => {
    request.mockResolvedValue({ data: { success: true } });
    await api.requestPasswordReset("a@b.com");
    expect(request).toHaveBeenCalledWith({
      baseURL: "https://password.example.com",
      url: "/v1/password/request-reset",
      method: "post",
      data: { email: "a@b.com" },
    });
  });

  it("requestPasswordReset returns response data", async () => {
    request.mockResolvedValue({ data: { success: true, message: "ok" } });
    await expect(api.requestPasswordReset("a@b.com")).resolves.toEqual({
      success: true,
      message: "ok",
    });
  });

  it("verifyResetCode sends email+code", async () => {
    request.mockResolvedValue({ data: { valid: true } });
    await api.verifyResetCode("a@b.com", "123456");
    expect(request).toHaveBeenCalledWith({
      baseURL: "https://password.example.com",
      url: "/v1/password/verify-code",
      method: "post",
      data: { email: "a@b.com", code: "123456" },
    });
  });

  it("verifyResetCode returns response data", async () => {
    request.mockResolvedValue({ data: { success: true, valid: true } });
    await expect(api.verifyResetCode("a@b.com", "123456")).resolves.toEqual({
      success: true,
      valid: true,
    });
  });

  it("resetPasswordByCode sends email/code/password", async () => {
    request.mockResolvedValue({ data: { success: true } });
    await api.resetPasswordByCode("a@b.com", "123456", "P@ss");
    expect(request).toHaveBeenCalledWith({
      baseURL: "https://password.example.com",
      url: "/v1/password/reset",
      method: "post",
      data: { email: "a@b.com", code: "123456", password: "P@ss" },
    });
  });

  it("resetPasswordByCode returns response data", async () => {
    request.mockResolvedValue({ data: { success: true, message: "changed" } });
    await expect(
      api.resetPasswordByCode("a@b.com", "123456", "P@ss")
    ).resolves.toEqual({ success: true, message: "changed" });
  });

  it("changePassword maps old/new/confirm keys", async () => {
    request.mockResolvedValue({ data: { success: true } });
    await api.changePassword("old", "new", "new");
    expect(request).toHaveBeenCalledWith({
      baseURL: "https://password.example.com",
      url: "/v1/password/change",
      method: "post",
      data: {
        old_password: "old",
        new_password: "new",
        confirm_password: "new",
      },
    });
  });

  it("changePassword propagates request failure", async () => {
    request.mockRejectedValue(new Error("change fail"));
    await expect(api.changePassword("old", "new", "new")).rejects.toThrow(
      "change fail"
    );
  });
});
