import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { FileType } from "./types/file";

export interface Student {
  id: number;
  name: string;
  age: number;
  grade: string;
  class: string;
  avatar: FileType;
  [key: string]: any;
}

export const getStudents = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["StudentSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<Student[]>({
    url: path.join("v1", "edu-student" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getStudent = (id: number) => {
  return request<Student>({
    url: `v1/edu-student/view?id=${id}`,
    method: "get",
  });
};

export const createStudent = (data: any) => {
  return request({
    url: "v1/edu-student/create",
    method: "post",
    data,
  });
};

export const updateStudent = (id: number, data: any) => {
  return request({
    url: `v1/edu-student/update?id=${id}`,
    method: "put",
    data,
  });
};

export const deleteStudent = (id: number) => {
  return request({
    url: `v1/edu-student/delete?id=${id}`,
    method: "delete",
  });
};
