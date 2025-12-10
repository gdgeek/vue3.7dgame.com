import request from "@/utils/request";
import qs from "querystringify";

import { EduClass } from "./types/edu-class";

export const getClasses = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "image,eduTeachers,eduStudents",
  school_id: number | null = null
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["ClassSearch[name]"] = search;
  }
  if (school_id !== null) {
    query["school_id"] = school_id;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: `/edu-class${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getClass = (id: number, expand = "") => {
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }
  return request<EduClass>({
    url: `/edu-class/${id}${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const createClass = (data: any) => {
  return request({
    url: `/edu-class`,
    method: "post",
    data,
  });
};

export const updateClass = (id: number, data: any) => {
  return request({
    url: `/edu-class/${id}`,
    method: "put",
    data,
  });
};

export const deleteClass = (id: number) => {
  return request({
    url: `/edu-class/${id}`,
    method: "delete",
  });
};

// Get classes where the current user is a teacher
export const getMyTeacherClasses = (
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
  return request<EduClass[]>({
    url: `/edu-class/by-teacher${qs.stringify(query, true)}`,
    method: "get",
  });
};

// Get classes where the current user is a student
// Returns class info with user_id for the current user
export const getMyStudentClasses = (
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
  return request<(EduClass & { user_id: number })[]>({
    url: `/edu-class/by-student${qs.stringify(query, true)}`,
    method: "get",
  });
};

// Apply to join a class as a student
export const applyToClass = (class_id: number) => {
  return request({
    url: `/edu-class/apply`,
    method: "post",
    data: { class_id },
  });
};

// Leave a class as a student
export const leaveClass = (class_id: number) => {
  return request({
    url: `/edu-class/leave`,
    method: "post",
    data: { class_id },
  });
};

// Search for classes to apply
export const searchClasses = (
  search = "",
  page = 1,
  expand = "image,school"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  if (search !== "") {
    query["ClassSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: `/edu-class${qs.stringify(query, true)}`,
    method: "get",
  });
};
