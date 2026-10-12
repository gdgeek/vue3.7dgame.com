import request from "@/utils/request";

export const getTags = () => {
  return request({
    url: "/v1/tags",
    method: "get",
  });
};
