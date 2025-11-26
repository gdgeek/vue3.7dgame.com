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
    url: `v1/edu-teacher/view?id=${id}`,
    method: "get",
  });
};

export const createTeacher = (data: any) => {
  return request({
    url: "v1/edu-teacher/create",
    method: "post",
    data,
  });
};

export const updateTeacher = (id: number, data: any) => {
  return request({
    url: `v1/edu-teacher/update?id=${id}`,
    method: "put",
    data,
  });
};

export const deleteTeacher = (id: number) => {
  return request({
    url: `v1/edu-teacher/delete?id=${id}`,
    method: "delete",
  });
};
