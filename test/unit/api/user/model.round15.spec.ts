import { describe, it, expectTypeOf } from "vitest";
import type {
  OrganizationInfoType,
  _UserDataType,
  UploadFileType,
  FileType,
  _InfoType,
  _UserInfoType,
  UserInfoType,
  UserInfoReturnType,
  UserQuery,
  UserPageVO,
  UserForm,
} from "@/api/user/model";

describe("src/api/user/model.ts round15", () => {
  it("OrganizationInfoType shape", () => {
    expectTypeOf<OrganizationInfoType>().toMatchTypeOf<{
      id: number;
      name: string;
      title: string;
    }>();
  });

  it("_UserDataType shape", () => {
    expectTypeOf<_UserDataType>().toMatchTypeOf<{
      nickname: string | null;
      email: string | null;
      username: string | null;
      emailBind: boolean | null;
    }>();
  });

  it("UploadFileType shape", () => {
    expectTypeOf<UploadFileType>().toMatchTypeOf<{
      md5: string;
      url: string;
      filename: string;
      key: string;
      particleType?: string;
    }>();
  });

  it("FileType shape", () => {
    expectTypeOf<FileType>().toMatchTypeOf<{
      id: number;
      md5: string;
      type: string;
      url: string;
      filename: string;
      size: number;
      key: string;
    }>();
  });

  it("_InfoType shape", () => {
    expectTypeOf<_InfoType>().toMatchTypeOf<{
      sex: string;
      industry: string;
      selectedOptions: string[];
      textarea: string;
    }>();
  });

  it("_UserInfoType shape", () => {
    expectTypeOf<_UserInfoType>().toMatchTypeOf<{
      info: _InfoType | null;
      gold: number;
      points: number;
      avatar: FileType | null;
    }>();
  });

  it("UserInfoType shape", () => {
    expectTypeOf<UserInfoType>().toMatchTypeOf<{
      id: number | null;
      userData: _UserDataType | null;
      userInfo: _UserInfoType | null;
      roles: string[] | null;
      perms: string[] | null;
      organizations?: OrganizationInfoType[];
    }>();
  });

  it("UserInfoReturnType shape", () => {
    expectTypeOf<UserInfoReturnType>().toMatchTypeOf<{
      success: boolean;
      message: string;
      data: UserInfoType;
    }>();
  });

  it("UserQuery/UserPageVO/UserForm basic compatibility", () => {
    expectTypeOf<UserQuery>().toMatchTypeOf<{
      keywords?: string;
      status?: number;
    }>();
    expectTypeOf<UserPageVO>().toMatchTypeOf<{
      username?: string;
      id?: number;
    }>();
    expectTypeOf<UserForm>().toMatchTypeOf<{
      username?: string;
      roleIds?: number[];
    }>();
  });
});
