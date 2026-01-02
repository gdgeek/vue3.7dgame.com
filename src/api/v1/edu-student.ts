import request from "@/utils/request";
import qs from "querystringify";
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
    url: `/edu-student${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getStudent = (id: number) => {
  return request<Student>({
    url: `/edu-student/view?id=${id}`,
    method: "get",
  });
};

export const createStudent = (data: { user_id?: number; class_id: number }) => {
  return request({
    url: `/edu-student`,
    method: "post",
    data,
  });
};
export const deleteStudent = (id: number) => {
  return request({
    url: `/edu-student/${id}`,
    method: "delete",
  });
};

export const updateStudent = (id: number, data: Partial<Student>) => {
  return request({
    url: `/edu-student/${id}`,
    method: "put",
    data,
  });
};

// Get current user's student records (classes the user has joined as a student)
export const getMyStudentRecords = (
  sort = "-created_at",
  page = 1,
  expand = "image,school"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (page > 1) {
    query["page"] = page;
  }
  return request<{ id: number; eduClass: any }[]>({
    url: `/edu-student${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getStudentMe = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "class,school"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (search !== "") {
    // Assuming search is for class name or similar generic search on the student record context
    query["StudentSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<Student[]>({
    url: `/edu-student/me${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const joinClass = (data: { class_id: number }) => {
  return request({
    url: `/edu-student/join`,
    method: "post",
    data,
  });
};
