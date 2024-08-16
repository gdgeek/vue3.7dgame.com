import request from "@/utils/request";

export const getTags = () => {
  return request({
    url: "v1/tags",
    method: "get",
  });
};

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
}
