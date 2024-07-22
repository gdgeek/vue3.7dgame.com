import request from "@/utils/request";

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
