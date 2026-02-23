import request from "@/utils/request";
import type { AppleData, AppleIdReturn } from "@/api/auth/model";

export const PostSiteAppleId = (data: AppleData) => {
  //alert(JSON.stringify(data));
  return request<AppleIdReturn>({
    url: `/v1/site/apple-id`,
    method: "post",
    data: data,
  });
};
