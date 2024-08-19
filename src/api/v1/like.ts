import request from "@/utils/request";

export type postLike = {
  message_id: number;
  created_at: {
    expression: string;
    params: [];
  };
  user_id: number;
  id: number;
};

export const postLike = (message_id: number) => {
  const data = { message_id };
  return request({
    url: "v1/likes",
    method: "post",
    data: data,
  });
};

export const removeLike = (message_id: number) => {
  return request({
    url: "v1/likes/remove?message_id=" + message_id,
    method: "post",
  });
};

export const isLike = (user_id: number, message_id: number) => {
  // 我是否like
  return request({
    url:
      "v1/likes?LikeSearch[message_id]=" +
      message_id +
      "&LikeSearch[user_id]=" +
      user_id,
    method: "get",
  });
};

export const getMessagesWithLiker = (
  liker: number,
  sorted = "-created_at",
  search = null,
  page = 0
) => {
  let url = "v1/messages?expand=author,messageTags&sort=" + sorted;
  if (!isNaN(liker)) {
    url += "&liker=" + liker;
  }
  if (search) {
    url += "&MessageSearch[title]=" + search;
  }
  if (page > 1) {
    url += "&page=" + page;
  }

  return request({
    url,
    method: "get",
  });
};
