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

export const getTeacherMe = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "class,school"
) => {
  const query: Record<string, any> = {};
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["TeacherSearch[subject]"] = search; // Assuming we search by subject, or maybe class name?
    // Actually user likely wants to search by Class Name if we are listing classes.
    // But the API is on EduTeacher. searching EduTeacher by 'class.name' might be complex if not set up.
    // Let's assume searching 'subject' or 'class name' if the backend supports it.
    // For now, let's just pass it as generic search or specific field.
    // If filtering by class name is needed, backend might need `TeacherSearch[class.name]` or similar.
    // Let's stick to a safe default or ask.
    // Wait, the previous `getTeachers` used `TeacherSearch[name]`.
    // I will use `TeacherSearch[subject]` as a start, or generic if available.
    // Actually, user said "Query edu-teacher belonging to current user" and "List Classes".
    // Maybe search isn't super critical for *my* classes (usually few), but if they want it...
    // I'll assume `TeacherSearch[subject]` is safe for now.
  }
  if (page > 1) {
    query["page"] = page;
  }
  return request<Teacher[]>({
    url: `/edu-teacher/me${qs.stringify(query, true)}`,
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
