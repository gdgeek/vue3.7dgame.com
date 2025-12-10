import request from "@/utils/request";
import qs from "querystringify";

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
    url: `/edu-teacher${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getTeacher = (id: number) => {
  return request<Teacher>({
    url: `/edu-teacher/${id}`,
    method: "get",
  });
};

export const createTeacher = (data: {
  user_id: number;
  class_id: number;
  school_id: number;
}) => {
  return request({
    url: `/edu-teacher`,
    method: "post",
    data,
  });
};

export const deleteTeacher = (id: number) => {
  return request({
    url: `/edu-teacher/${id}`,
    method: "delete",
  });
};

export const updateTeacher = (id: number, data: Partial<Teacher>) => {
  return request({
    url: `/edu-teacher/${id}`,
    method: "put",
    data,
  });
};
