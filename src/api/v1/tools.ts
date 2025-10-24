import request from "@/utils/request";

export const getUserLinked = () => {
  //alert(1);
  return request({
    url: "v1/tools/user-linked",
    method: "get",
  });
};
