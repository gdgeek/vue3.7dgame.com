import request from "@/utils/request";
import { Author } from "./verse";
import { ReplyType } from "./reply";

type MessageTag = {
  id: number;
  message_id: number;
  tag_id: number;
};

export type Like = {
  id: number;
  user_id: number;
  message_id: number;
  created_at: string;
};

export type MessageType = {
  id?: number;
  title: string;
  body: string;
  author_id?: number;
  updater_id?: number;
  created_at?: string;
  updated_at?: string;
  info?: string;
  author?: Author;
  likesCount?: number;
  like?: Like | null;
  replies?: ReplyType[];
  messageTags?: MessageTag[];
} | null;

export const postMessageAPI = (data: any) => {
  return request<any>({
    url: "v1/messages",
    method: "post",
    data: data,
  });
};

export const getMessage = (id: number) => {
  return request<MessageType>({
    url:
      "v1/messages/" +
      id +
      "?expand=messageTags,replies,author,like,likesCount",
    method: "get",
  });
};

export const getMessages = (
  sort = "-created_at",
  search = null,
  page = 0,
  tag = NaN
) => {
  let url = "v1/messages?expand=author,messageTags&sort=" + sort;
  if (!isNaN(tag)) {
    url += "&tag=" + tag;
  }
  if (search) {
    url += "&MessageSearch[title]=" + search;
  }
  if (page > 1) {
    url += "&page=" + page;
  }

  return request<MessageType[]>({
    url,
    method: "get",
  });
};

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

export function putMessage(id: number, data: any) {
  return request({
    url: "v1/messages/" + id,
    method: "put",
    data: data,
  });
}
export function deleteMessage(id: number) {
  return request({
    url: "v1/messages/" + id,
    method: "delete",
  });
}
