import request from "@/utils/request";

import qs from "querystringify";

export const getTags = (type: string | null = null) => {
  const query: Record<string, unknown> = {};
  if (type !== null) {
    query["TagsSearch[type]"] = type;
  }
  return request({
    url: `/v1/tags${qs.stringify(query, true)}`,
    method: "get",
  });
};
