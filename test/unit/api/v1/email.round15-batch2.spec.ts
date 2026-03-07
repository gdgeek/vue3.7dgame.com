import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/environment", () => ({
  default: {
    email_api: "https://email.example.test",
  },
}));

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("api/v1/email round15 batch2", () => {
  let request: ReturnType<typeof vi.fn>;
  let api: typeof import("@/api/v1/email");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: { success: true } });
    api = await import("@/api/v1/email");
  });

  it("getEmailStatus sends GET to status endpoint", async () => {
    await api.getEmailStatus();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://email.example.test",
        url: "/v1/email/status",
        method: "get",
      })
    );
  });

  it("sendVerificationCode posts email", async () => {
    await api.sendVerificationCode("u@test.com");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/email/send-verification",
        method: "post",
        data: { email: "u@test.com" },
      })
    );
  });

  it("verifyEmailCode posts payload", async () => {
    const payload = { email: "u@test.com", code: "123456" };
    await api.verifyEmailCode(payload);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/email/verify", method: "post", data: payload })
    );
  });

  it("sendChangeConfirmation has no data field", async () => {
    await api.sendChangeConfirmation();
    const arg = request.mock.calls[0][0];
    expect(arg.url).toBe("/v1/email/send-change-confirmation");
    expect(arg.method).toBe("post");
  });

  it("verifyChangeConfirmation posts code", async () => {
    await api.verifyChangeConfirmation("ABC");
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/email/verify-change-confirmation", data: { code: "ABC" } })
    );
  });

  it("unbindEmail sends {} when code omitted", async () => {
    await api.unbindEmail();
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/email/unbind", data: {} })
    );
  });

  it("unbindEmail sends code when provided", async () => {
    await api.unbindEmail("ZXC");
    expect(request.mock.calls[0][0].data).toEqual({ code: "ZXC" });
  });

  it("cooldown and test endpoints are queried correctly", async () => {
    await api.getEmailCooldown("u@test.com");
    await api.testEmailService();
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: "/v1/email/cooldown", method: "get", params: { email: "u@test.com" } })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({ url: "/v1/email/test", method: "get" })
    );
  });
});
