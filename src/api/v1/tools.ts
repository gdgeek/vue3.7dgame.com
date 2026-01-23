import request from "@/utils/request";

export const getUserLinked = () => {
  return request({
    url: `/v1/tools/user-linked`,
    method: "get",
  });
};
