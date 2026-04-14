import request from "@/utils/request";
import qs from "querystringify";

export type userData = {
  id: string;
  username: string;
  nickname: string | null;
  roles: string[];
  avatar: {
    url: string;
    [key: string]: unknown;
  };
  organizations?: PersonOrganization[];
  [key: string]: unknown;
};

export type PersonOrganization = {
  id: number;
  name: string;
  title: string;
};

export const postPerson = (data: unknown) => {
  return request({
    url: `/v1/people`,
    method: "post",
    data: data,
  });
};

export const deletePerson = (id: number) => {
  return request({
    url: `/v1/people/${id}`,
    method: "delete",
  });
};

export const putPerson = (data: { id: number; auth: string }) => {
  return request({
    url: `/v1/people/auth`,
    method: "put",
    data,
  });
};

export const putPersonNickname = (
  id: number,
  data: { nickname: string | null }
) => {
  return request({
    url: `/v1/people/${id}`,
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
    url: `/v1/people${qs.stringify(query, true)}`,
    method: "get",
  });
};
