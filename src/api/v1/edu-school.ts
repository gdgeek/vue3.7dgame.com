import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { EduSchool } from "./types/edu-school";
export interface UserType {
  id: number;
  nickname: string;
  username: string;
}

export const getSchools = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["SchoolSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduSchool[]>({
    url: path.join("v1", "edu-school" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getSchool = (id: number) => {
  return request<EduSchool>({
    url: `v1/edu-school/view?id=${id}`,
    method: "get",
  });
};

export const createSchool = (data: any) => {
  return request({
    url: "v1/edu-school/create",
    method: "post",
    data,
  });
};

export const updateSchool = (id: number, data: any) => {
  return request({
    url: `v1/edu-school/update?id=${id}`,
    method: "put",
    data,
  });
};

export const deleteSchool = (id: number) => {
  return request({
    url: `v1/edu-school/delete?id=${id}`,
    method: "delete",
  });
};
