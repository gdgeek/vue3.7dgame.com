import request from "@/utils/request";

import qs from "querystringify";
import path from "path-browserify";

export const getTags = () => {
  const query: Record<string, any> = [];

  query["TagsSearch[type]"] = "Classify";

  return request({
    url: path.join("v1", "tags" + qs.stringify(query, true)),

    method: "get",
  });
};
/*
export const getMessageTag = (tag_id: number, page = 0) => {
  return request({
    url:
      "v1/message-tags?expand=message&MessageTagsSearch[tag_id]=" +
      tag_id +
      "&page=" +
      page +
      "&expand=message",
    method: "get",
  });
};

export function removeMessageTag(message_id: number, tag_id: number) {
  return request({
    url: "v1/message-tags/0?message_id=" + message_id + "&tag_id=" + tag_id,
    method: "delete",
  });
}
export function addMessageTag(message_id: number, tag_id: number) {
  const data = { message_id, tag_id };

  return request({
    url: "v1/message-tags",
    method: "post",
    data,
  });
}*/
