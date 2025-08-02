import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export type PhototypeType = {
  id?: number;
  title?: string;
  uuid?: string | null;
  data?: string | null;
  style?: string | null;
  created_at?: string;
  updated_at?: string;
  image_id?: number | null;
  updater_id?: number;
  author_id?: number;
  author?: {
    id: number;
    nickname: string;
    email: string | null;
    username: string;
  };
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
    url: path.join("v1", "phototypes"),
    method: "post",
    data,
  });
};

export const getPhototype = (id: string | number, params = {}) => {
  return request<PhototypeType>({
    url: path.join(
      "v1",
      "phototypes",
      `${id.toString()}${qs.stringify(params, true)}`
    ),
    method: "get",
  });
};

export const getPhototypes = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
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
  const url = path.join("v1", "phototypes") + qs.stringify(query, true);
  //alert(url);
  return request<PhototypeType[]>({
    url,
    method: "get",
  });
};

export const putPhototype = (id: string | number, data: PhototypeType) => {
  return request<PhototypeType>({
    url: path.join("v1", "phototypes", id.toString()),
    method: "put",
    data,
  });
};

export const deletePhototype = (id: string | number) => {
  return request({
    url: path.join("v1", "phototypes", id.toString()),
    method: "delete",
  });
};
