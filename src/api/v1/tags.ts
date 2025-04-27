import request from "@/utils/request";

import qs from "querystringify";
import path from "path-browserify";

export const getTags = (type: string = "Classify") => {
  const query: Record<string, any> = [];
  query["TagsSearch[type]"] = type;
  return request({
    url: path.join("v1", "tags" + qs.stringify(query, true)),
    method: "get",
  });
};
