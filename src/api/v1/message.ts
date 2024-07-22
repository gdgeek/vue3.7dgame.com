import request from "@/utils/request";

export const getMessagesWithAuthor = (
  author_id: number,
  sort = "-created_at",
  search = null,
  page = 0
) => {
  let url = "v1/messages?expand=author,messageTags&sort=" + sort;
  if (!isNaN(author_id)) {
    url += "&MessageSearch[author_id]=" + author_id;
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
