import { describe, expect, it } from "vitest";

import {
  isInvalidCredentialsError,
  LoginRequestError,
  normalizeLoginError,
} from "@/services/auth/loginError";

describe("login error normalization", () => {
  it("extracts the status, code, and message before treating AxiosError as Error", () => {
    const axiosError = Object.assign(
      new Error("Request failed with status code 401"),
      {
        response: {
          status: 401,
          data: {
            code: "INVALID_CREDENTIALS",
            message: "Username or password is invalid.",
          },
        },
      }
    );

    const normalized = normalizeLoginError(axiosError);

    expect(normalized).toBeInstanceOf(LoginRequestError);
    expect(normalized).toMatchObject({
      name: "LoginRequestError",
      code: "INVALID_CREDENTIALS",
      status: 401,
      message: "Username or password is invalid.",
    });
    expect(isInvalidCredentialsError(normalized)).toBe(true);
  });

  it("recognizes a login 401 as invalid credentials without exposing Axios text", () => {
    const normalized = normalizeLoginError({
      response: {
        status: 401,
        data: {},
      },
    });

    expect(normalized.message).toBe("Login failed, please try again later.");
    expect(isInvalidCredentialsError(normalized)).toBe(true);
  });

  it("preserves ordinary non-HTTP errors", () => {
    const networkError = new Error("Network Error");

    expect(normalizeLoginError(networkError)).toBe(networkError);
    expect(isInvalidCredentialsError(networkError)).toBe(false);
  });
});
