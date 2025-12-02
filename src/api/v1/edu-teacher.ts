import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export interface Teacher {
  id: number;
  name: string;
  subject: string;
  phone: string;
  avatar: string;
  [key: string]: any;
}

export const getTeachers = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["TeacherSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<Teacher[]>({
    url: path.join("v1", "edu-teacher" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getTeacher = (id: number) => {
  return request<Teacher>({
    url: `v1/edu-teacher/${id}`,
    method: "get",
  });
};

export const createTeacher = (data: {
  user_id: number;
  class_id: number;
  school_id: number;
}) => {
  return request({
    url: "v1/edu-teacher",
    method: "post",
    data,
  });
};

export const deleteTeacher = (id: number) => {
  return request({
    url: `v1/edu-teacher/${id}`,
    method: "delete",
  });
};
