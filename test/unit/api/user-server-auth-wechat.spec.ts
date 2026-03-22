/**
 * Unit tests for:
 *   src/api/user/server.ts  — bindEmail, resetPassword
 *   src/api/auth/wechat.ts  — getQrcode, refresh
 *   src/api/user/index.ts   — UserAPI.getInfo
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));
vi.mock("@/environment", () => ({
  default: {
    api: "https://auth.example.com",
  },
}));

// -----------------------------------------------------------------------
// user/server.ts
// -----------------------------------------------------------------------
describe("user/server: bindEmail()", () => {
  let request: ReturnType<typeof vi.fn>;
  let bindEmail: typeof import("@/api/user/server").bindEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ bindEmail } = await import("@/api/user/server"));
  });

  it("calls POST /v1/servers/bind-email", async () => {
    await bindEmail("user@example.com");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/servers/bind-email", method: "post" })
    );
  });

  it("sends email in request body", async () => {
    await bindEmail("user@example.com");
    expect(request.mock.calls[0][0].data).toEqual({
      email: "user@example.com",
    });
  });
});

describe("user/server: resetPassword()", () => {
  let request: ReturnType<typeof vi.fn>;
  let resetPassword: typeof import("@/api/user/server").resetPassword;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ resetPassword } = await import("@/api/user/server"));
  });

  it("calls POST /v1/servers/reset-password", async () => {
    await resetPassword("old-pw", "new-pw");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/servers/reset-password",
        method: "post",
      })
    );
  });

  it("sends oldPassword and password in request body", async () => {
    await resetPassword("old123", "new456");
    expect(request.mock.calls[0][0].data).toEqual({
      oldPassword: "old123",
      password: "new456",
    });
  });
});

// -----------------------------------------------------------------------
// auth/wechat.ts
// -----------------------------------------------------------------------
describe("auth/wechat: getQrcode()", () => {
  let request: ReturnType<typeof vi.fn>;
  let getQrcode: typeof import("@/api/auth/wechat").getQrcode;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ getQrcode } = await import("@/api/auth/wechat"));
  });

  it("calls GET with URL containing auth_api + /v1/wechat/qrcode", async () => {
    await getQrcode();
    const callUrl: string = request.mock.calls[0][0].url;
    expect(callUrl).toContain("auth.example.com");
    expect(callUrl).toContain("/v1/wechat/qrcode");
    expect(request.mock.calls[0][0].method).toBe("get");
  });
});

describe("auth/wechat: refresh()", () => {
  let request: ReturnType<typeof vi.fn>;
  let refresh: typeof import("@/api/auth/wechat").refresh;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ refresh } = await import("@/api/auth/wechat"));
  });

  it("calls GET with auth_api + /v1/wechat/refresh?token=<value>", async () => {
    await refresh("my-token");
    const callUrl: string = request.mock.calls[0][0].url;
    expect(callUrl).toContain("/v1/wechat/refresh");
    expect(callUrl).toContain("token=my-token");
    expect(request.mock.calls[0][0].method).toBe("get");
  });

  it("includes null token in URL when token is null", async () => {
    await refresh(null);
    const callUrl: string = request.mock.calls[0][0].url;
    expect(callUrl).toContain("token=null");
  });
});

// -----------------------------------------------------------------------
// user/index.ts (UserAPI)
// -----------------------------------------------------------------------
describe("UserAPI.getInfo()", () => {
  let request: ReturnType<typeof vi.fn>;
  let UserAPI: typeof import("@/api/user/index").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ default: UserAPI } = await import("@/api/user/index"));
  });

  it("calls GET /v1/user/info", async () => {
    await UserAPI.getInfo();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/v1/user/info", method: "get" })
    );
  });

  it("does not send a request body", async () => {
    await UserAPI.getInfo();
    expect(request.mock.calls[0][0].data).toBeUndefined();
  });

  it("returns the request result", async () => {
    const mockData = { id: 1, username: "alice" };
    request.mockResolvedValue({ data: mockData });
    const result = await UserAPI.getInfo();
    expect(result).toEqual({ data: mockData });
  });
});

describe("user/server: bindEmail() — additional", () => {
  let request: ReturnType<typeof vi.fn>;
  let bindEmail: typeof import("@/api/user/server").bindEmail;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ bindEmail } = await import("@/api/user/server"));
  });

  it("uses POST method", async () => {
    await bindEmail("a@b.com");
    expect(request.mock.calls[0][0].method).toBe("post");
  });
});

describe("auth/wechat: refresh() — empty token", () => {
  let request: ReturnType<typeof vi.fn>;
  let refresh: typeof import("@/api/auth/wechat").refresh;

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    ({ refresh } = await import("@/api/auth/wechat"));
  });

  it("handles empty string token", async () => {
    await refresh("");
    const callUrl: string = request.mock.calls[0][0].url;
    expect(callUrl).toContain("token=");
  });
});
