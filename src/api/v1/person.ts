import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export type userData = {
  id: string;
  username: string;
  nickname: string;
  roles: string[];
  avatar: {
    url: string;
    [key: string]: any;
  };
  [key: string]: any;
};

export const postPerson = (data: any) => {
  return request({
    url: "v1/people",
    method: "post",
    data: data,
  });
};

export const deletePerson = (id: number) => {
  return request({
    url: "v1/people/" + id,
    method: "delete",
  });
};

export const putPerson = (data: { id: number; auth: string }) => {
  return request({
    url: "v1/people/auth",
    method: "put",
    data,
  });
};

export const getPerson = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["UserSearch[username]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<userData[]>({
    url: path.join("v1", "people" + qs.stringify(query, true)),
    method: "get",
  });
};
