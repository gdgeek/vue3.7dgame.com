import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

import { EduClass } from "./types/edu-class";

export const getClasses = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "image",
  school_id: number | null = null
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["ClassSearch[name]"] = search;
  }
  if (school_id !== null) {
    query["ClassSearch[school_id]"] = school_id;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: path.join("v1", "edu-class" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getClass = (id: number) => {
  return request<EduClass>({
    url: `v1/edu-class/${id}`,
    method: "get",
  });
};

export const createClass = (data: any) => {
  return request({
    url: "v1/edu-class",
    method: "post",
    data,
  });
};

export const updateClass = (id: number, data: any) => {
  return request({
    url: `v1/edu-class/${id}`,
    method: "put",
    data,
  });
};

export const deleteClass = (id: number) => {
  return request({
    url: `v1/edu-class/${id}`,
    method: "delete",
  });
};
