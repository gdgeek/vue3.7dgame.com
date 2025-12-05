import request from "@/utils/request";
import qs from "querystringify";

export interface DomainInfo {
  domain: string;
  title: string;
  info: {
    description: string;
    keywords: string;
    author: string;
  };
}

export const getDomainInfo = (url: string) => {
  const query = {
    url,
  };
  return request<DomainInfo>({
    url: `/domain/info${qs.stringify(query, true)}`,
    method: "get",
  });
};

export default {
  getDomainInfo,
};
