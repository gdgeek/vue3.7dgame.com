import request from "@/utils/request";

import qs from "querystringify";
import path from "path-browserify";

export const takePhoto = (verse_id: number) => {
  const query: Record<string, any> = [];
  query["verse_id"] = verse_id;
  const url = path.join(
    "v1",
    "system",
    "take-photo" + qs.stringify(query, true)
  );

  console.log(url);
  return request({
    url,
    method: "post",
  });
};
