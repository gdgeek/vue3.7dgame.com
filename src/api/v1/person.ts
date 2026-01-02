import request from "@/utils/request";
import qs from "querystringify";

export type userData = {
  id: string;
  username: string;
  nickname: string;
  roles: string[];
  avatar: {
    url: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const postPerson = (data: unknown) => {
  return request({
    url: `/people`,
    method: "post",
    data: data,
  });
};

export const deletePerson = (id: number) => {
  return request({
    url: `/people/${id}`,
    method: "delete",
  });
};

export const putPerson = (data: { id: number; auth: string }) => {
  return request({
    url: `/people/auth`,
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
  const query: Record<string, unknown> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (search !== "") {
    query["PersonSearch[username]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<userData[]>({
    url: `/people${qs.stringify(query, true)}`,
    method: "get",
  });
};
