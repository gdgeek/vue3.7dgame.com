import request from "@/utils/request";
import qs from "querystringify";

import { AxiosResponse } from "axios";
import { ResourceInfo } from "./resources/model";
export type PhototypeType = {
  id?: number;
  type?: string | null;
  title?: string;
  uuid?: string | null;
  data?: any | null;
  schema?: any | null;
  created_at?: string;
  updated_at?: string;
  image_id?: number | null;
  updater_id?: number;
  author_id?: number;
  resource_id?: number | null;
  author?: {
    id: number;
    nickname: string;
    email: string | null;
    username: string;
  };
  resource?: ResourceInfo | null;
  image?: {
    id: number;
    md5: string;
    type: string;
    url: string;
    filename: string;
    size: number;
    key: string;
  };
};

export const postPhototype = (data: PhototypeType) => {
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
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }
  const url = `/phototypes/${id}${qs.stringify(query, true)}`;
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
  const query: Record<string, any> = {};
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
  const url = `/phototypes${qs.stringify(query, true)}`;

  return request<PhototypeType[]>({
    url,
    method: "get",
  });
};

export const putPhototype = (
  id: string | number,
  data: PhototypeType,
  expand = "resource,image"
) => {
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }
  const url = `/phototypes/${id}${qs.stringify(query, true)}`;
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
