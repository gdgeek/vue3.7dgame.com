import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const getVerseOpenVerses = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
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
    url: path.join("v1", "verse-opens", "verses" + qs.stringify(query, true)),
    method: "get",
  });
};
export const postVerseOpen = (data: any) => {
  return request({
    url: "v1/verse-opens",
    method: "post",
    data,
  });
};
export const deleteVerseOpen = (id: number) => {
  return request({
    url: "v1/verse-opens/" + id,
    method: "delete",
  });
};
