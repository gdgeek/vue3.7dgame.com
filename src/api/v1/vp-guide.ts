import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const postVpGuide = (data: any) => {
  return request({
    url: "v1/vp-guides",
    method: "post",
    data: data,
  });
};

export const getVerses = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author,share"
) => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["VerseSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  return request({
    url: path.join("v1", "vp-guides", "verses" + qs.stringify(query, true)),
    method: "get",
  });
};
export const getVpGuide = (id: number) => {
  return request({
    url: "v1/vp-guides/" + id,
    method: "get",
  });
};
export const getVpGuides = (page = 0) => {
  const query: Record<string, any> = [];

  query["sort"] = "order";
  if (page > 1) {
    query["page"] = page;
  }

  return request({
    url: path.join("v1", "vp-guides" + qs.stringify(query, true)),
    method: "get",
  });
};

export const putVpGuide = (id: number, data: any) => {
  return request({
    url: "v1/vp-guides/" + id,
    method: "put",
    data,
  });
};
export const deleteVpGuide = (id: number) => {
  return request({
    url: "v1/vp-guides/" + id,
    method: "delete",
  });
};
