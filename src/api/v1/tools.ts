import request from "@/utils/request";

export const getUserLinked = () => {
  return request({
    url: `/v1/tools/user-linked`,
    method: "get",
  });
};

export const getUserLinkedStatus = (key: string) => {
  return request({
    url: `/v1/tools/user-linked/status`,
    method: "get",
    params: { key },
  });
};
