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
    url: `/v1/edu-class${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getClass = (id: number, expand = "") => {
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }
  return request<EduClass>({
    url: `/v1/edu-class/${id}${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const createClass = (data: any) => {
  return request({
    url: `/v1/edu-class`,
    method: "post",
    data,
  });
};

export const updateClass = (id: number, data: any) => {
  return request({
    url: `/v1/edu-class/${id}`,
    method: "put",
    data,
  });
};

export const deleteClass = (id: number) => {
  return request({
    url: `/v1/edu-class/${id}`,
    method: "delete",
  });
};

// Get classes where the current user is a teacher
export const getMyTeacherClasses = (
  sort = "-created_at",
  page = 1,
  expand = "image"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: `/v1/edu-class/teacher-me${qs.stringify(query, true)}`,
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
    url: `/v1/edu-class/by-student${qs.stringify(query, true)}`,
    method: "get",
  });
};

// Apply to join a class as a student
export const applyToClass = (class_id: number) => {
  return request({
    url: `/v1/edu-class/apply`,
    method: "post",
    data: { class_id },
  });
};

// Leave a class as a student
export const leaveClass = (class_id: number) => {
  return request({
    url: `/v1/edu-class/leave`,
    method: "post",
    data: { class_id },
  });
};

// Search for classes to apply
export const searchClasses = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "image,school"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (search !== "") {
    query["ClassSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: `/v1/edu-class${qs.stringify(query, true)}`,
    method: "get",
  });
};

// Get group for a class
export const getClassGroups = (
  classId: number,
  sort = "-created_at",
  search = "",
  page = 1,
  expand = ""
) => {
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }

  query["sort"] = sort;

  if (search !== "") {
    query["GroupSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request({
    url: `/v1/edu-class/${classId}/groups${qs.stringify(query, true)}`,
    method: "get",
  });
};

// Create group from a class
export const createClassGroup = (
  classId: number,
  data: { name?: string; description?: string; image_id?: number | null } = {}
) => {
  return request({
    url: `/v1/edu-class/${classId}/group`,
    method: "post",
    data,
  });
};

export const addTeacherToClass = (classId: number, teacherId: number) => {
  return request({
    url: `/v1/edu-class/${classId}/teacher`,
    method: "post",
    data: { user_id: teacherId },
  });
};

// Remove a teacher from a class
export const removeTeacherFromClass = (classId: number, teacherId: number) => {
  return request({
    url: `/v1/edu-class/${classId}/teacher`,
    method: "delete",
    data: { user_id: teacherId },
  });
};

// Get classes by a specific teacher ID
export const getClassesByTeacher = (
  teacherId: number,
  sort = "-created_at",
  page = 1,
  expand = "image"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  query["user_id"] = teacherId;
  if (page > 1) {
    query["page"] = page;
  }
  return request<EduClass[]>({
    url: `/v1/edu-class/by-teacher${qs.stringify(query, true)}`,
    method: "get",
  });
};
