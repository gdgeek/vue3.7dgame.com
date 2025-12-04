import request from "@/utils/request";

import qs from "querystringify";

export const takePhoto = (verse_id: number) => {
  const query: Record<string, any> = [];
  query["verse_id"] = verse_id;
  const url = `/system/take-photo${qs.stringify(query, true)}`;

  console.log(url);
  return request({
    url,
    method: "post",
    data: {
      verse_id,
    },
  });
};
