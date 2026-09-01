import {
  LOGIN_HOST_BY_ROLE,
  LOGIN_PATH,
  LOGIN_RESPONSE_MAX_BYTES,
  LOGOUT_PATH,
  MIN_TOKEN_TTL_MS,
  PROTOCOL,
  REQUEST_TIMEOUT_MS as PROTOCOL_REQUEST_TIMEOUT_MS,
  type RunnerFailureCode,
  type RunnerRole,
} from "@/services/task51/memoryRunnerProtocol";

const TASK51_LOGIN_PROTOCOL = PROTOCOL;
const REQUEST_TIMEOUT_MS = PROTOCOL_REQUEST_TIMEOUT_MS;
const MAX_RESPONSE_BYTES = LOGIN_RESPONSE_MAX_BYTES;
const MIN_TOKEN_TTL_SECONDS = MIN_TOKEN_TTL_MS / 1000;
const MAX_CREDENTIAL_BYTES = 16 * 1024;

export type Task51EvidenceRole = RunnerRole;

export interface Task51LoginCaptureCommand {
  protocol: typeof TASK51_LOGIN_PROTOCOL;
  type: "CAPTURE";
  role: Task51EvidenceRole;
  username: string;
  password: string;
  vaultPort: MessagePort;
}

export interface Task51LoginCaptureSuccess {
  protocol: typeof TASK51_LOGIN_PROTOCOL;
  type: "CAPTURE_OK";
  role: Task51EvidenceRole;
  accessBytes: ArrayBuffer;
  expiresAtMs: number;
  loginHttpStatus: number;
  logoutHttpStatus: number;
}

export interface Task51LoginCaptureFailure {
  protocol: typeof TASK51_LOGIN_PROTOCOL;
  type: "CAPTURE_FAILED";
  role: Task51EvidenceRole;
  code: RunnerFailureCode;
}

export interface Task51LoginControlFailure {
  protocol: typeof TASK51_LOGIN_PROTOCOL;
  type: "FAILED";
  code: RunnerFailureCode;
}

export type Task51LoginWorkerCommand = Task51LoginCaptureCommand;
export type Task51LoginWorkerSafeMessage = Task51LoginControlFailure;

export type Task51LoginCaptureResult =
  | Task51LoginCaptureSuccess
  | Task51LoginCaptureFailure;

interface MessagePortLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  close(): void;
}

interface Task51LoginWorkerDependencies {
  fetch: typeof fetch;
  now: () => number;
  serviceWorkerController: () => unknown | null;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
  closeWorker: () => void;
  postControlFailure: (failure: Task51LoginControlFailure) => void;
}

interface JsonResponse {
  response: Response;
  value: unknown;
}

interface LoginTokenMaterial {
  accessToken: string;
  refreshToken: string;
  expires: string;
  tokenType: string | undefined;
}

interface ValidatedAccessToken {
  accessToken: string;
  expiresAtMs: number;
}

class LoginWorkerFailure extends Error {
  constructor(readonly code: RunnerFailureCode) {
    super(code);
    this.name = "LoginWorkerFailure";
  }
}

const LOGIN_ORIGIN_BY_ROLE: Readonly<Record<Task51EvidenceRole, string>> =
  LOGIN_HOST_BY_ROLE;

const FETCH_BASE: Readonly<
  Pick<
    RequestInit,
    | "method"
    | "mode"
    | "credentials"
    | "redirect"
    | "cache"
    | "referrerPolicy"
    | "keepalive"
  >
> = Object.freeze({
  method: "POST",
  mode: "cors",
  credentials: "omit",
  redirect: "error",
  cache: "no-store",
  referrerPolicy: "no-referrer",
  keepalive: false,
});

function currentWorkerServiceWorkerController(): unknown | null {
  if (typeof globalThis.navigator === "undefined") return null;
  const workerNavigator = globalThis.navigator as {
    readonly serviceWorker?: { readonly controller?: unknown | null };
  };
  return workerNavigator.serviceWorker?.controller ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvidenceRole(value: unknown): value is Task51EvidenceRole {
  return (
    value === "user" ||
    value === "manager" ||
    value === "admin" ||
    value === "root"
  );
}

function isMessagePortLike(value: unknown): value is MessagePortLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.postMessage === "function" && typeof value.close === "function"
  );
}

function isBoundedNonEmptyString(
  value: unknown,
  maxBytes: number
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    new TextEncoder().encode(value).byteLength <= maxBytes
  );
}

function isCaptureCommand(value: unknown): value is Task51LoginCaptureCommand {
  if (!isRecord(value)) return false;

  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "password",
    "protocol",
    "role",
    "type",
    "username",
    "vaultPort",
  ];

  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    value.protocol === TASK51_LOGIN_PROTOCOL &&
    value.type === "CAPTURE" &&
    isEvidenceRole(value.role) &&
    isBoundedNonEmptyString(value.username, MAX_CREDENTIAL_BYTES) &&
    isBoundedNonEmptyString(value.password, MAX_CREDENTIAL_BYTES) &&
    isMessagePortLike(value.vaultPort)
  );
}

function failureResult(
  role: Task51EvidenceRole,
  code: RunnerFailureCode
): Task51LoginCaptureFailure {
  return {
    protocol: TASK51_LOGIN_PROTOCOL,
    type: "CAPTURE_FAILED",
    role,
    code,
  };
}

function controlFailure(code: RunnerFailureCode): Task51LoginControlFailure {
  return {
    protocol: TASK51_LOGIN_PROTOCOL,
    type: "FAILED",
    code,
  };
}

function failureFromUnknown(
  command: Task51LoginCaptureCommand,
  error: unknown
): Task51LoginCaptureFailure {
  if (error instanceof LoginWorkerFailure) {
    return failureResult(command.role, error.code);
  }
  return failureResult(command.role, "WORKER_ERROR");
}

function endpoint(origin: string, path: string): string {
  return `${origin}${path}`;
}

async function readBoundedBody(
  response: Response,
  tooLargeCode: RunnerFailureCode
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_RESPONSE_BYTES) {
      throw new LoginWorkerFailure(tooLargeCode);
    }
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESPONSE_BYTES) {
      bytes.fill(0);
      throw new LoginWorkerFailure(tooLargeCode);
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new LoginWorkerFailure(tooLargeCode);
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    reader.releaseLock();
  }
}

function assertExactResponse(response: Response, expectedUrl: string): void {
  if (response.redirected) {
    throw new LoginWorkerFailure("REDIRECT_REJECTED");
  }
  if (response.url !== expectedUrl) {
    throw new LoginWorkerFailure("REDIRECT_REJECTED");
  }
  if (!response.ok || response.status < 200 || response.status >= 300) {
    throw new LoginWorkerFailure("HTTP_STATUS_REJECTED");
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }
}

async function fetchJsonOnce(
  deps: Task51LoginWorkerDependencies,
  url: string,
  init: RequestInit
): Promise<JsonResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = deps.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let bytes: Uint8Array | null = null;
  let raw = "";
  try {
    if (deps.serviceWorkerController() !== null) {
      throw new LoginWorkerFailure("SERVICE_WORKER_ACTIVE");
    }
    let response: Response;
    try {
      response = await deps.fetch(url, { ...init, signal: controller.signal });
    } catch (_error) {
      throw new LoginWorkerFailure(
        timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"
      );
    }

    assertExactResponse(response, url);
    try {
      bytes = await readBoundedBody(response, "RESPONSE_TOO_LARGE");
    } catch (error) {
      if (error instanceof LoginWorkerFailure) throw error;
      throw new LoginWorkerFailure(
        timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"
      );
    }

    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { response, value: JSON.parse(raw) as unknown };
    } catch (error) {
      if (error instanceof LoginWorkerFailure) throw error;
      throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
    }
  } finally {
    deps.clearTimeout(timeout);
    bytes?.fill(0);
    raw = "";
  }
}

function extractTokenMaterial(value: unknown): LoginTokenMaterial {
  if (!isRecord(value) || value.success !== true || !isRecord(value.token)) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  const accessToken = value.token.accessToken;
  const refreshToken = value.token.refreshToken;
  const expires = value.token.expires;
  const tokenType = value.token.tokenType;

  if (
    !isBoundedNonEmptyString(accessToken, MAX_CREDENTIAL_BYTES) ||
    !isBoundedNonEmptyString(refreshToken, MAX_CREDENTIAL_BYTES) ||
    !isBoundedNonEmptyString(expires, 256) ||
    (tokenType !== undefined && typeof tokenType !== "string")
  ) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  return { accessToken, refreshToken, expires, tokenType };
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const segments = accessToken.split(".");
  if (
    segments.length !== 3 ||
    segments.some((segment) => segment.length === 0)
  ) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const payload = JSON.parse(decoded) as unknown;
      if (!isRecord(payload)) throw new Error("invalid payload");
      return payload;
    } finally {
      bytes.fill(0);
    }
  } catch (_error) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }
}

function parseWallClock(value: string): number[] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    value
  );
  if (!match) return null;

  const fields = match.slice(1).map(Number);
  const [year, month, day, hour, minute, second] = fields;
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day ||
    utc.getUTCHours() !== hour ||
    utc.getUTCMinutes() !== minute ||
    utc.getUTCSeconds() !== second
  ) {
    return null;
  }
  return fields;
}

function expiresCouldRepresentJwtExp(expires: string, jwtExp: number): boolean {
  const fields = parseWallClock(expires);
  if (!fields) return false;
  const [year, month, day, hour, minute, second] = fields;
  const wallClockUtcSeconds =
    Date.UTC(year, month - 1, day, hour, minute, second) / 1000;

  // The legacy response has no timezone. It is not used for TTL; this only
  // rejects a value that cannot represent the JWT expiry in any real-world
  // quarter-hour UTC offset from UTC-12 through UTC+14.
  for (
    let offsetMinutes = -12 * 60;
    offsetMinutes <= 14 * 60;
    offsetMinutes += 15
  ) {
    const candidate = wallClockUtcSeconds - offsetMinutes * 60;
    if (Math.abs(candidate - jwtExp) <= 2) return true;
  }
  return false;
}

function validateAccessToken(
  token: LoginTokenMaterial,
  nowMs: number
): ValidatedAccessToken {
  if (
    token.tokenType !== undefined &&
    token.tokenType.trim().toLowerCase() !== "bearer"
  ) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  const payload = decodeJwtPayload(token.accessToken);
  const jwtExp = payload.exp;
  if (typeof jwtExp !== "number" || !Number.isFinite(jwtExp) || jwtExp <= 0) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  const expiresAtMs = jwtExp * 1000;
  if (expiresAtMs - nowMs < MIN_TOKEN_TTL_SECONDS * 1000) {
    throw new LoginWorkerFailure("TTL_INSUFFICIENT");
  }

  if (!parseWallClock(token.expires)) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }
  if (!expiresCouldRepresentJwtExp(token.expires, jwtExp)) {
    throw new LoginWorkerFailure("RESPONSE_SCHEMA_REJECTED");
  }

  return { accessToken: token.accessToken, expiresAtMs };
}

function assertLogoutRevoked(value: unknown): void {
  if (!isRecord(value) || value.success !== true || value.revoked !== true) {
    throw new LoginWorkerFailure("REVOKE_FAILED");
  }
}

function jsonHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function executeCapture(
  command: Task51LoginCaptureCommand,
  deps: Task51LoginWorkerDependencies
): Promise<Task51LoginCaptureSuccess> {
  const origin = LOGIN_ORIGIN_BY_ROLE[command.role];
  const loginUrl = endpoint(origin, LOGIN_PATH);
  const logoutUrl = endpoint(origin, LOGOUT_PATH);
  let loginBody = JSON.stringify({
    username: command.username,
    password: command.password,
  });
  let logoutBody = "";
  let material: LoginTokenMaterial | null = null;
  let validated: ValidatedAccessToken | null = null;

  try {
    const login = await fetchJsonOnce(deps, loginUrl, {
      ...FETCH_BASE,
      headers: jsonHeaders(),
      body: loginBody,
    });

    material = extractTokenMaterial(login.value);
    let validationError: unknown = null;
    try {
      validated = validateAccessToken(material, deps.now());
    } catch (error) {
      validationError = error;
    }

    // Revocation is attempted exactly once whenever a structurally valid
    // refresh token was issued, even if a later access-token gate fails.
    logoutBody = JSON.stringify({ refreshToken: material.refreshToken });
    const logout = await fetchJsonOnce(deps, logoutUrl, {
      ...FETCH_BASE,
      headers: jsonHeaders(material.accessToken),
      body: logoutBody,
    });
    assertLogoutRevoked(logout.value);

    if (validationError) throw validationError;
    if (!validated) throw new LoginWorkerFailure("WORKER_ERROR");

    const encoded = new TextEncoder().encode(validated.accessToken);
    const accessBytes = encoded.buffer as ArrayBuffer;
    return {
      protocol: TASK51_LOGIN_PROTOCOL,
      type: "CAPTURE_OK",
      role: command.role,
      accessBytes,
      expiresAtMs: validated.expiresAtMs,
      loginHttpStatus: login.response.status,
      logoutHttpStatus: logout.response.status,
    };
  } finally {
    loginBody = "";
    logoutBody = "";
    material = null;
    validated = null;
  }
}

export function createTask51MemoryLoginWorkerHandler(
  overrides: Partial<Task51LoginWorkerDependencies> = {}
): (event: MessageEvent<unknown>) => Promise<void> {
  const deps: Task51LoginWorkerDependencies = {
    fetch: globalThis.fetch.bind(globalThis),
    now: () => Date.now(),
    serviceWorkerController: currentWorkerServiceWorkerController,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    closeWorker: () => undefined,
    postControlFailure: () => undefined,
    ...overrides,
  };
  let consumed = false;

  return async (event: MessageEvent<unknown>): Promise<void> => {
    const candidate = event.data;

    if (consumed) {
      if (
        isRecord(candidate) &&
        isEvidenceRole(candidate.role) &&
        isMessagePortLike(candidate.vaultPort)
      ) {
        candidate.vaultPort.postMessage(
          failureResult(candidate.role, "DUPLICATE_DISPATCH")
        );
        candidate.vaultPort.close();
      } else {
        deps.postControlFailure(controlFailure("DUPLICATE_DISPATCH"));
      }
      deps.closeWorker();
      return;
    }
    consumed = true;

    if (!isCaptureCommand(candidate)) {
      if (
        isRecord(candidate) &&
        isEvidenceRole(candidate.role) &&
        isMessagePortLike(candidate.vaultPort)
      ) {
        candidate.vaultPort.postMessage(
          failureResult(candidate.role, "WORKER_ERROR")
        );
        candidate.vaultPort.close();
      } else {
        deps.postControlFailure(controlFailure("WORKER_ERROR"));
      }
      deps.closeWorker();
      return;
    }

    const port = candidate.vaultPort as unknown as MessagePortLike;
    try {
      const result = await executeCapture(candidate, deps);
      port.postMessage(result, [result.accessBytes]);
    } catch (error) {
      port.postMessage(failureFromUnknown(candidate, error));
    } finally {
      port.close();
      deps.closeWorker();
    }
  };
}

interface LoginWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
}

const isWorkerRealm =
  typeof document === "undefined" &&
  typeof globalThis.postMessage === "function" &&
  typeof globalThis.close === "function";

if (isWorkerRealm) {
  const scope = globalThis as unknown as LoginWorkerScope;
  const handler = createTask51MemoryLoginWorkerHandler({
    closeWorker: () => scope.close(),
    postControlFailure: (failure) => scope.postMessage(failure),
  });
  scope.onmessage = (event) => {
    void handler(event);
  };
}

export {
  LOGIN_ORIGIN_BY_ROLE,
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
  TASK51_LOGIN_PROTOCOL,
};
export type { RunnerFailureCode };
