import { describe, expect, it, vi } from "vitest";

import {
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
  TASK51_LOGIN_PROTOCOL,
  createTask51MemoryLoginWorkerHandler,
  type Task51EvidenceRole,
  type Task51LoginCaptureCommand,
  type Task51LoginCaptureResult,
  type Task51LoginControlFailure,
} from "@/workers/task51MemoryLogin.worker";

const NOW_MS = Date.UTC(2026, 7, 27, 0, 0, 0);
const VALID_EXP_SECONDS = NOW_MS / 1000 + 3 * 60 * 60;

function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function syntheticJwt(exp = VALID_EXP_SECONDS): string {
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify({ exp, fixture: true })),
    "synthetic-fixture-signature",
  ].join(".");
}

function formatUtcWallClock(seconds: number): string {
  const value = new Date(seconds * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(
      value.getUTCDate()
    )}`,
    `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(
      value.getUTCSeconds()
    )}`,
  ].join(" ");
}

function jsonResponse(
  url: string,
  body: unknown,
  options: { status?: number; redirected?: boolean; contentType?: string } = {}
): Response {
  const response = new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      "Content-Type": options.contentType ?? "application/json; charset=UTF-8",
    },
  });
  Object.defineProperties(response, {
    url: { value: url },
    redirected: { value: options.redirected ?? false },
  });
  return response;
}

function originForRole(role: Task51EvidenceRole): string {
  return role === "user" || role === "manager"
    ? "https://api.xrteeth.com"
    : "https://api.tmrpp.com";
}

function responseForRole(
  role: Task51EvidenceRole,
  path: string,
  body: unknown,
  options: Parameters<typeof jsonResponse>[2] = {}
): Response {
  return jsonResponse(`${originForRole(role)}${path}`, body, options);
}

class FakePort {
  readonly messages: Task51LoginCaptureResult[] = [];
  readonly transfers: Transferable[][] = [];
  closed = false;

  postMessage(
    message: Task51LoginCaptureResult,
    transfer: Transferable[] = []
  ) {
    this.messages.push(message);
    this.transfers.push(transfer);
  }

  close() {
    this.closed = true;
  }
}

function command(
  port: FakePort,
  role: Task51EvidenceRole = "user"
): Task51LoginCaptureCommand {
  return {
    protocol: TASK51_LOGIN_PROTOCOL,
    type: "CAPTURE",
    role,
    username: `synthetic-${role}`,
    password: "synthetic-password-only",
    vaultPort: port as unknown as MessagePort,
  };
}

function createFetchForRole(
  role: Task51EvidenceRole,
  accessToken = syntheticJwt(),
  exp = VALID_EXP_SECONDS,
  tokenOverrides: Record<string, unknown> = {}
) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      responseForRole(role, "/v1/auth/login", {
        success: true,
        token: {
          accessToken,
          refreshToken: "synthetic-refresh-fixture",
          expires: formatUtcWallClock(exp),
          ...tokenOverrides,
        },
      })
    )
    .mockResolvedValueOnce(
      responseForRole(role, "/v1/auth/logout", {
        success: true,
        message: "logout",
        revoked: true,
      })
    );
}

function handlerWith(
  fetchMock: typeof fetch,
  closeWorker = vi.fn(),
  serviceWorkerController: () => unknown | null = () => null
) {
  return {
    closeWorker,
    handler: createTask51MemoryLoginWorkerHandler({
      fetch: fetchMock,
      now: () => NOW_MS,
      serviceWorkerController,
      closeWorker,
    }),
  };
}

describe("task51MemoryLogin.worker", () => {
  it.each([
    ["user", "https://api.xrteeth.com"],
    ["manager", "https://api.xrteeth.com"],
    ["admin", "https://api.tmrpp.com"],
    ["root", "https://api.tmrpp.com"],
  ] as const)(
    "captures %s only through its fixed host and revokes before transfer",
    async (role, origin) => {
      const bearer = syntheticJwt();
      const fetchMock = createFetchForRole(role, bearer);
      const { handler, closeWorker } = handlerWith(fetchMock);
      const port = new FakePort();

      await handler({ data: command(port, role) } as MessageEvent<unknown>);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        `${origin}/v1/auth/login`,
        `${origin}/v1/auth/logout`,
      ]);

      const loginInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect(loginInit).toMatchObject({
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        keepalive: false,
      });
      expect(JSON.parse(loginInit.body as string)).toEqual({
        username: `synthetic-${role}`,
        password: "synthetic-password-only",
      });
      expect(new Headers(loginInit.headers).get("Authorization")).toBeNull();

      const logoutInit = fetchMock.mock.calls[1][1] as RequestInit;
      expect(JSON.parse(logoutInit.body as string)).toEqual({
        refreshToken: "synthetic-refresh-fixture",
      });
      expect(new Headers(logoutInit.headers).get("Authorization")).toBe(
        `Bearer ${bearer}`
      );

      expect(port.messages).toHaveLength(1);
      const result = port.messages[0];
      expect(result.type).toBe("CAPTURE_OK");
      if (result.type !== "CAPTURE_OK") throw new Error("unexpected result");
      expect(Object.keys(result).sort()).toEqual(
        [
          "accessBytes",
          "expiresAtMs",
          "loginHttpStatus",
          "logoutHttpStatus",
          "protocol",
          "role",
          "type",
        ].sort()
      );
      expect(result).toMatchObject({
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE_OK",
        role,
        expiresAtMs: VALID_EXP_SECONDS * 1000,
        loginHttpStatus: 200,
        logoutHttpStatus: 200,
      });
      expect(new TextDecoder().decode(result.accessBytes)).toBe(bearer);
      expect(port.transfers[0]).toEqual([result.accessBytes]);
      expect(JSON.stringify(result)).not.toContain(bearer);
      expect(JSON.stringify(result)).not.toContain("synthetic-password-only");
      expect(port.closed).toBe(true);
      expect(closeWorker).toHaveBeenCalledOnce();
    }
  );

  it.each([undefined, "bEaReR"])(
    "accepts an implicit or case-insensitive Bearer token type (%s)",
    async (tokenType) => {
      const fetchMock = createFetchForRole(
        "user",
        syntheticJwt(),
        VALID_EXP_SECONDS,
        tokenType === undefined ? {} : { tokenType }
      );
      const { handler } = handlerWith(fetchMock);
      const port = new FakePort();

      await handler({ data: command(port) } as MessageEvent<unknown>);

      expect(port.messages[0].type).toBe("CAPTURE_OK");
    }
  );

  it("revokes exactly once and maps an invalid token schema safely", async () => {
    const fetchMock = createFetchForRole(
      "user",
      syntheticJwt(),
      VALID_EXP_SECONDS,
      { tokenType: "Basic" }
    );
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(port.messages).toEqual([
      {
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE_FAILED",
        role: "user",
        code: "RESPONSE_SCHEMA_REJECTED",
      },
    ]);
    expect(port.transfers[0]).toEqual([]);
  });

  it("enforces the login worker's 35 minute TTL floor without extra skew", async () => {
    const exp = NOW_MS / 1000 + 35 * 60 - 1;
    const fetchMock = createFetchForRole("user", syntheticJwt(exp), exp);
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(port.messages[0]).toEqual({
      protocol: TASK51_LOGIN_PROTOCOL,
      type: "CAPTURE_FAILED",
      role: "user",
      code: "TTL_INSUFFICIENT",
    });
  });

  it("requires an exact successful revoke before transfer", async () => {
    const bearer = syntheticJwt();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        responseForRole("user", "/v1/auth/login", {
          success: true,
          token: {
            accessToken: bearer,
            refreshToken: "synthetic-refresh-fixture",
            expires: formatUtcWallClock(VALID_EXP_SECONDS),
          },
        })
      )
      .mockResolvedValueOnce(
        responseForRole("user", "/v1/auth/logout", {
          success: true,
          revoked: false,
        })
      );
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(port.messages[0]).toMatchObject({
      type: "CAPTURE_FAILED",
      role: "user",
      code: "REVOKE_FAILED",
    });
    expect(port.transfers[0]).toEqual([]);
  });

  it("maps a redirect to REDIRECT_REJECTED without retry or logout", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        responseForRole(
          "user",
          "/v1/auth/login",
          { success: false },
          { redirected: true }
        )
      );
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(port.messages[0]).toMatchObject({
      type: "CAPTURE_FAILED",
      code: "REDIRECT_REJECTED",
    });
  });

  it("fails closed before both login and logout dispatch when a service worker is active", async () => {
    const activeController = Object.freeze({ active: true });

    const loginFetch = createFetchForRole("user");
    const loginController = vi.fn(() => activeController);
    const loginWorker = handlerWith(loginFetch, vi.fn(), loginController);
    const loginPort = new FakePort();

    await loginWorker.handler({
      data: command(loginPort),
    } as MessageEvent<unknown>);

    expect(loginController).toHaveBeenCalledOnce();
    expect(loginFetch).not.toHaveBeenCalled();
    expect(loginPort.messages).toEqual([
      {
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE_FAILED",
        role: "user",
        code: "SERVICE_WORKER_ACTIVE",
      },
    ]);
    expect(loginPort.transfers).toEqual([[]]);
    expect(loginPort.closed).toBe(true);
    expect(loginWorker.closeWorker).toHaveBeenCalledOnce();

    const logoutFetch = createFetchForRole("user");
    const logoutController = vi
      .fn<() => unknown | null>()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(activeController);
    const logoutWorker = handlerWith(logoutFetch, vi.fn(), logoutController);
    const logoutPort = new FakePort();

    await logoutWorker.handler({
      data: command(logoutPort),
    } as MessageEvent<unknown>);

    expect(logoutController).toHaveBeenCalledTimes(2);
    expect(logoutFetch).toHaveBeenCalledOnce();
    expect(logoutFetch.mock.calls[0][0]).toBe(
      "https://api.xrteeth.com/v1/auth/login"
    );
    expect(logoutPort.messages).toEqual([
      {
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE_FAILED",
        role: "user",
        code: "SERVICE_WORKER_ACTIVE",
      },
    ]);
    expect(logoutPort.transfers).toEqual([[]]);
    expect(logoutPort.closed).toBe(true);
    expect(logoutWorker.closeWorker).toHaveBeenCalledOnce();
  });

  it("maps a body larger than 64 KiB to RESPONSE_TOO_LARGE", async () => {
    const response = new Response("x".repeat(MAX_RESPONSE_BYTES + 1), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    Object.defineProperties(response, {
      url: { value: "https://api.xrteeth.com/v1/auth/login" },
      redirected: { value: false },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(response);
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(port.messages[0]).toMatchObject({
      type: "CAPTURE_FAILED",
      code: "RESPONSE_TOO_LARGE",
    });
  });

  it("maps the 15 second abort deadline to REQUEST_TIMEOUT", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("synthetic abort"));
          });
        })
    );
    const setTimeoutMock = vi.fn((callback: () => void, delay?: number) => {
      expect(delay).toBe(REQUEST_TIMEOUT_MS);
      queueMicrotask(callback);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    const closeWorker = vi.fn();
    const handler = createTask51MemoryLoginWorkerHandler({
      fetch: fetchMock,
      now: () => NOW_MS,
      setTimeout: setTimeoutMock as unknown as typeof globalThis.setTimeout,
      clearTimeout: vi.fn() as unknown as typeof globalThis.clearTimeout,
      closeWorker,
    });
    const port = new FakePort();

    await handler({ data: command(port) } as MessageEvent<unknown>);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(port.messages[0]).toMatchObject({
      type: "CAPTURE_FAILED",
      code: "REQUEST_TIMEOUT",
    });
    expect(closeWorker).toHaveBeenCalledOnce();
  });

  it("rejects non-exact command keys through the vault port", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const { handler } = handlerWith(fetchMock);
    const port = new FakePort();
    const candidate = {
      ...command(port),
      unexpected: "must-not-be-accepted",
    };

    await handler({ data: candidate } as MessageEvent<unknown>);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(port.messages).toEqual([
      {
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE_FAILED",
        role: "user",
        code: "WORKER_ERROR",
      },
    ]);
  });

  it("sends only a safe FAILED code to main when there is no usable port", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const controlFailures =
      vi.fn<(failure: Task51LoginControlFailure) => void>();
    const closeWorker = vi.fn();
    const handler = createTask51MemoryLoginWorkerHandler({
      fetch: fetchMock,
      now: () => NOW_MS,
      closeWorker,
      postControlFailure: controlFailures,
    });

    await handler({
      data: {
        protocol: TASK51_LOGIN_PROTOCOL,
        type: "CAPTURE",
        role: "not-a-role",
        username: "synthetic-user",
        password: "secret-must-not-echo",
      },
    } as MessageEvent<unknown>);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(controlFailures).toHaveBeenCalledWith({
      protocol: TASK51_LOGIN_PROTOCOL,
      type: "FAILED",
      code: "WORKER_ERROR",
    });
    expect(JSON.stringify(controlFailures.mock.calls)).not.toContain(
      "secret-must-not-echo"
    );
    expect(closeWorker).toHaveBeenCalledOnce();
  });
});
