import request from "@/utils/request";

export const getUserLinked = () => {
  return request({
    url: `/tools/user-linked`,
    method: "get",
  });
};
