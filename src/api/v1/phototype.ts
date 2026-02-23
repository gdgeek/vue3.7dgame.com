import request from "@/utils/request";
import qs from "querystringify";
import type { AxiosResponse } from "axios";
import type {
  PhototypeType,
  CreatePhototypeRequest,
  UpdatePhototypeRequest,
} from "./types/phototype";

export const postPhototype = (data: CreatePhototypeRequest) => {
  return request<PhototypeType>({
    url: `/v1/phototypes`,
    method: "post",
    data,
  });
};

export const getPhototype = (
  id: string | number,
  expand = "resource,image"
) => {
  const query: Record<string, unknown> = {};
  if (expand) {
    query["expand"] = expand;
  }
  const url = `/v1/phototypes/${id}${qs.stringify(query, true)}`;
  return request<PhototypeType>({
    url,
    method: "get",
  });
};

export const getPhototypes = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "resource,image,author"
): Promise<AxiosResponse<PhototypeType[]>> => {
  const query: Record<string, unknown> = {};
  if (sort === "title") {
    sort = "title";
  } else if (sort === "-title") {
    sort = "-title";
  }
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["PhototypeSearch[title]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  const url = `/v1/phototypes${qs.stringify(query, true)}`;

  return request<PhototypeType[]>({
    url,
    method: "get",
  });
};

export const putPhototype = (
  id: string | number,
  data: UpdatePhototypeRequest,
  expand = "resource,image"
) => {
  const query: Record<string, unknown> = {};
  if (expand) {
    query["expand"] = expand;
  }
  const url = `/v1/phototypes/${id}${qs.stringify(query, true)}`;
  return request<PhototypeType>({
    url,
    method: "put",
    data,
  });
};

export const deletePhototype = (id: string | number) => {
  return request({
    url: `/v1/phototypes/${id}`,
    method: "delete",
  });
};
