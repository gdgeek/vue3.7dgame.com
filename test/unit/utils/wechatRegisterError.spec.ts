import { describe, expect, it } from "vitest";
import { getWechatRegisterErrorMessages } from "@/utils/wechatRegisterError";

const t = (key: string) =>
  ({
    "login.registerErrors.usernameTaken": "用户名已被占用",
    "login.registerErrors.usernameEmailFormat": "用户名无需邮箱格式",
    "login.error": "表单检验未通过",
  })[key] ?? key;

describe("getWechatRegisterErrorMessages", () => {
  it("maps Yii username JSON errors to localized duplicate username text", () => {
    const error = {
      response: {
        data: {
          message:
            '{"username":["Username \\"dirui1981\\" has already been taken."]}',
        },
      },
    };

    expect(getWechatRegisterErrorMessages(error, t)).toEqual([
      "用户名已被占用",
    ]);
  });

  it("maps legacy username email validation to username-specific text", () => {
    const error = {
      response: {
        data: {
          message: '{"username":["The email format is invalid."]}',
        },
      },
    };

    expect(getWechatRegisterErrorMessages(error, t)).toEqual([
      "用户名无需邮箱格式",
    ]);
  });

  it("keeps password policy messages from the API", () => {
    const error = {
      response: {
        data: {
          password: ["至少 8 个字符"],
        },
      },
    };

    expect(getWechatRegisterErrorMessages(error, t)).toEqual(["至少 8 个字符"]);
  });
});
