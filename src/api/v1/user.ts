import type { AxiosError } from "axios";
import env from "@/environment";
import request from "@/utils/request";
import qs from "querystringify";
import { UserInfoReturnType } from "../user/model";

export type userCreationData = {
  pictureCount: number;
  polygenCount: number;
  videoCount: number;
  postCount: number;
  likeCount: number;
  verseCount: number;
};

type ProfileWriteErrorBody = {
  code?: string;
  message?: string;
};

export const getUserCreation = () => {
  const query = {
    expand:
      "pictureCount,videoCount,polygenCount,postCount,likeCount, verseCount",
  };
  return request<userCreationData>({
    url: `/v1/user/creation${qs.stringify(query, true)}`,
    method: "get",
  });
};

const legacyPutUserData = (data: unknown) => {
  return request<UserInfoReturnType>({
    url: `/v1/user/update`,
    method: "put",
    data,
  });
};

const identityPutUserData = (data: unknown) => {
  return request<UserInfoReturnType>({
    baseURL: env.authApi,
    url: `/v1/user/update`,
    method: "put",
    data,
    skipErrorMessage: true,
  });
};

export const putUserData = async (data: unknown) => {
  if (!env.authApi) {
    return legacyPutUserData(data);
  }

  try {
    return await identityPutUserData(data);
  } catch (error) {
    if (shouldFallbackToLegacyProfileWrite(error)) {
      return legacyPutUserData(data);
    }

    throw error;
  }
};

function shouldFallbackToLegacyProfileWrite(error: unknown): boolean {
  const axiosError = error as AxiosError;
  const response = axiosError.response;

  if (!response) {
    return true;
  }

  if ([502, 503, 504].includes(response.status)) {
    return true;
  }

  if (response.status !== 404) {
    return false;
  }

  const data = response.data;
  const body: ProfileWriteErrorBody = isProfileWriteErrorBody(data) ? data : {};
  const code = body.code;
  if (
    code === "PROFILE_WRITE_DISABLED" ||
    code === "PROFILE_WRITE_UNSUPPORTED_MODE"
  ) {
    return true;
  }

  if (code) {
    return false;
  }

  const message = body.message ?? "";
  if (message.startsWith("Cannot PUT /v1/user/update")) {
    return true;
  }

  return typeof data === "string" || data == null;
}

function isProfileWriteErrorBody(
  value: unknown
): value is ProfileWriteErrorBody {
  return typeof value === "object" && value !== null;
}

export const info = () => {
  return request<UserInfoReturnType>({
    url: `/v1/user/info`,
    method: "get",
  });
};
