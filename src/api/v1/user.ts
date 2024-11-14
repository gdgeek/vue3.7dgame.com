import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { getUserInfoData } from "../user/model";

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
  const url = path.join("v1", "users", "creation" + qs.stringify(query, true));
  return request<userCreationData>({
    url,
    method: "get",
  });
};

export const putUserData = (data: any) => {
  const url = path.join("v1", "users", "set-data");
  return request<getUserInfoData>({
    url,
    method: "put",
    data,
  });
};
