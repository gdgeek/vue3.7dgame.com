import { describe, it, expectTypeOf } from "vitest";
import type {
  RegisterData,
  LinkData,
  AppleIdToken,
  AppleData,
  AppleIdTokenAndUserPassData,
  UserData,
  AppleIdReturn,
  LoginData,
  LoginResult,
  CaptchaResult,
} from "@/api/auth/model";

describe("src/api/auth/model.ts round15", () => {
  it("RegisterData shape", () => {
    expectTypeOf<RegisterData>().toMatchTypeOf<{
      username: string;
      password: string;
      repassword: string;
    }>();
  });

  it("LinkData shape", () => {
    expectTypeOf<LinkData>().toMatchTypeOf<{ username: string; password: string }>();
  });

  it("AppleIdToken shape", () => {
    expectTypeOf<AppleIdToken>().toMatchTypeOf<{ apple_id: string; token: string }>();
  });

  it("AppleData shape", () => {
    expectTypeOf<AppleData>().toMatchTypeOf<{ key: string; url: string; data: unknown }>();
  });

  it("AppleIdTokenAndUserPassData shape", () => {
    expectTypeOf<AppleIdTokenAndUserPassData>().toMatchTypeOf<{
      username: string;
      password: string;
      token: string;
      apple_id: string;
    }>();
  });

  it("UserData shape", () => {
    expectTypeOf<UserData>().toMatchTypeOf<{
      nickname: string;
      email: string;
      username: string;
      auth: string;
    }>();
  });

  it("AppleIdReturn shape", () => {
    expectTypeOf<AppleIdReturn>().toMatchTypeOf<{
      apple_id: string;
      email: string;
      user: UserData;
      token: string;
    }>();
  });

  it("LoginData shape", () => {
    expectTypeOf<LoginData>().toMatchTypeOf<{ username: string; password: string }>();
  });

  it("LoginResult shape", () => {
    expectTypeOf<LoginResult>().toMatchTypeOf<{
      nickname: string;
      email: string | null;
      username: string;
      roles: string[];
      auth: string;
    }>();
  });

  it("CaptchaResult shape", () => {
    expectTypeOf<CaptchaResult>().toMatchTypeOf<{
      captchaKey: string;
      captchaBase64: string;
    }>();
  });
});
