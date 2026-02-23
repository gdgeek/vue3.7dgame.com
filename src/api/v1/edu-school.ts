import request from "@/utils/request";
import qs from "querystringify";
import type {
  EduSchool,
  CreateSchoolRequest,
  UpdateSchoolRequest,
} from "./types/edu-school";

export const getSchools = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "image,principal"
) => {
  const query: Record<string, unknown> = {};
  query["expand"] = expand;
  query["sort"] = sort;

  if (search) {
    query["search"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  return request<EduSchool[]>({
    url: `/v1/edu-school${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getSchool = (id: number, expand = "image,principal") => {
  const query: Record<string, unknown> = {};
  if (expand) {
    query["expand"] = expand;
  }
  return request<EduSchool>({
    url: `/v1/edu-school/${id}${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const createSchool = (data: CreateSchoolRequest) => {
  return request({
    url: `/v1/edu-school`,
    method: "post",
    data,
  });
};

export const updateSchool = (id: number, data: UpdateSchoolRequest) => {
  return request({
    url: `/v1/edu-school/${id}`,
    method: "put",
    data,
  });
};

export const deleteSchool = (id: number) => {
  return request({
    url: `/v1/edu-school/${id}`,
    method: "delete",
  });
};

export const getPrincipalSchools = (
  sort = "-created_at",
  search = "",
  page = 1,
  expand = "image,principal"
) => {
  const query: Record<string, unknown> = {};
  query["expand"] = expand;
  query["sort"] = sort;

  if (search) {
    query["search"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  return request<EduSchool[]>({
    url: `/v1/edu-school/principal${qs.stringify(query, true)}`,
    method: "get",
  });
};
