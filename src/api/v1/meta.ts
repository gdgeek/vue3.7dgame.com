import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const postMeta = (data: Record<string, any>) => {
  return request({
    url: path.join("v1", "metas"),
    method: "post",
    data,
  });
};

export const getMeta = (id: number | string, expand = "") => {
  return request({
    url: path.join(
      "v1",
      "metas",
      `${id.toString()}${qs.stringify({ expand: expand }, true)}`
    ),
    method: "get",
  });
};

export const getMetas = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query: Record<string, any> = {};
  if (sort === "name") {
    sort = "title";
  } else if (sort === "-name") {
    sort = "-title";
  }
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["MetaSearch[title]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  return request({
    url: path.join("v1", "metas") + qs.stringify(query, true),
    method: "get",
  });
};

export const putMeta = (id: number | string, data: Record<string, any>) => {
  return request({
    url: path.join("v1", "metas", id.toString()),
    method: "put",
    data,
  });
};

export const deleteMeta = (id: number | string) => {
  return request({
    url: path.join("v1", "metas", id.toString()),
    method: "delete",
  });
};
