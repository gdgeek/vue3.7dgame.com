import request from "@/utils/request";

export interface AppleIdData {
  key: string;
  url: string;
  data: any;
}

export interface AppleIdReturn {
  apple_id: string;
  email: string;
  user: any;
  token: string;
}
export const PostSiteAppleId = (data: AppleIdData) => {
  //alert(JSON.stringify(data));
  return request({
    url: `/v1/site/apple-id`,
    method: "post",
    data: data,
  });
};
