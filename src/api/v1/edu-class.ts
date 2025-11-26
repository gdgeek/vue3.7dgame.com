import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export interface Class {
  id: number;
  name: string;
  grade: string;
  teacher: string;
  avatar: string;
  [key: string]: any;
}

export const getClasses = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["ClassSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<Class[]>({
    url: path.join("v1", "edu-class" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getClass = (id: number) => {
  return request<Class>({
    url: `v1/edu-class/view?id=${id}`,
    method: "get",
  });
};

export const createClass = (data: any) => {
  return request({
    url: "v1/edu-class/create",
    method: "post",
    data,
  });
};

export const updateClass = (id: number, data: any) => {
  return request({
    url: `v1/edu-class/update?id=${id}`,
    method: "put",
    data,
  });
};

export const deleteClass = (id: number) => {
  return request({
    url: `v1/edu-class/delete?id=${id}`,
    method: "delete",
  });
};
