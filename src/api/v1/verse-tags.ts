import request from "@/utils/request";
import path from "path-browserify";

export const postVerseTags = (verse_id: number, tags_id: number) => {
  return request({
    url: path.join("v1", "verse-tags"),
    method: "post",
    data: {
      verse_id,
      tags_id,
    },
  });
};
export const removeVerseTags = (verse_id: number, tags_id: number) => {
  return request({
    url: path.join("v1", "verse-tags", "remove"),
    method: "post",
    data: {
      verse_id,
      tags_id,
    },
  });
};
