import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { UserInfoReturnType } from "../user/model";

export type userCreationData = {
  pictureCount: number;
  polygenCount: number;
  videoCount: number;
  postCount: number;
  likeCount: number;
  verseCount: number;
};

export const getUserCreation = () => {
  const query = {
    expand:
      "pictureCount,videoCount,polygenCount,postCount,likeCount, verseCount",
  };
  const url = path.join("v1", "user", "creation" + qs.stringify(query, true));
  return request<userCreationData>({
    url,
    method: "get",
  });
};

export const putUserData = (data: any) => {
  const url = path.join("v1", "user", "set-data");
  return request<UserInfoReturnType>({
    url,
    method: "put",
    data,
  });
};

export const info = () => {
  const url = path.join("v1", "user", "info");
  return request<UserInfoReturnType>({
    url,
    method: "get",
  });
};

export default {
  getUserCreation,
  putUserData,
  info,
};
