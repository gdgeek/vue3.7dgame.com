import request from "@/utils/request";

export const postVerseTags = (verse_id: number, tags_id: number) => {
  return request({
    url: `/verse-tags`,
    method: "post",
    data: {
      verse_id,
      tags_id,
    },
  });
};
export const removeVerseTags = (verse_id: number, tags_id: number) => {
  return request({
    url: `/verse-tags/remove`,
    method: "post",
    data: {
      verse_id,
      tags_id,
    },
  });
};
