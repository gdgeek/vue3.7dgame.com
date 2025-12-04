import request from "@/utils/request";
import { Author } from "./verse";

export type ReplyType = {
  id: number;
  message_id: number;
  body: string;
  author_id: number;
  updater_id: number;
  created_at: string;
  updated_at: string;
  info: string;
  author: Author;
};

export const postReply = (data: any) => {
  return request({
    url: `/replies`,
    method: "post",
    data: data,
  });
};

export const getReply = (id: number) => {
  return request<ReplyType>({
    url: `/replies/${id}?expand=message`,
    method: "get",
  });
};

export const getReplies = (message_id = -1, sort = "created_at", page = 0) => {
  let url = `/replies?expand=author&sort=${sort}`;
  if (message_id !== -1) {
    url += `&ReplySearch[message_id]=${message_id}`;
  }
  if (page > 1) {
    url += `&page=${page}`;
  }
  return request<ReplyType[]>({
    url,
    method: "get",
  });
};

export const putReply = (id: number, data: any) => {
  return request({
    url: `/replies/${id}`,
    method: "put",
    data: data,
  });
};

export const deleteReply = (id: number) => {
  return request({
    url: `/replies/${id}`,
    method: "delete",
  });
};
