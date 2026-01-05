import request from "@/utils/request";
import qs from "querystringify";

export interface DomainInfo {
  domain: string;
  title: string;
  description: string;
  keywords: string;
  author: string;
  links: {
    name: string;
    url: string;
  }[];
}

export const getDomainInfo = (
  url: string = "https://xingkou.net",
  lang: string = "en-US"
) => {
  //url = "https://xingkou.net";
  const query = {
    url,
    lang,
  };

  return request<DomainInfo>({
    url: `/domain/info${qs.stringify(query, true)}`,
    method: "get",
  });
};

export default {
  getDomainInfo,
};
