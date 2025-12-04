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

export const getUserCreation = () => {
  const query = {
    expand:
      "pictureCount,videoCount,polygenCount,postCount,likeCount, verseCount",
  };
  return request<userCreationData>({
    url: `/user/creation${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putUserData = (data: any) => {
  console.error(data);
  return request<UserInfoReturnType>({
    url: `/user/update`,
    method: "put",
    data,
  });
};

export const info = () => {
  return request<UserInfoReturnType>({
    url: `/user/info`,
    method: "get",
  });
};

export default {
  getUserCreation,
  putUserData,
  info,
};
