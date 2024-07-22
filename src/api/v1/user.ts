import request from "@/utils/request";
import type { userCreationData } from "@/typings/api_v1/user";
import qs from "querystringify";

import path from "path-browserify";

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
