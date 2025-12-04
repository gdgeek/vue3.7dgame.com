import request from "@/utils/request";
import qs from "querystringify";
import type { VerseShare } from "@/api/v1/verse";

export const putVerseShare = (id: number, data: any) => {
  return request({
    url: `/verse-shares/${id}`,
    method: "put",
    data,
  });
};

export const postVerseShare = (data: any) => {
  return request({
    url: `/verse-shares`,
    method: "post",
    data,
  });
};

export const getVerseShareVerses = (
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
    url: `/verse-shares/verses${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const getVerseShares = (verseId: number) => {
  const query: Record<string, any> = [];
  query["verse_id"] = verseId;
  const url = `/verse-shares${qs.stringify(query, true)}`;
  return request<VerseShare[]>({
    url,
    method: "get",
  });
};
export const deleteVerseShare = (id: number) => {
  return request({
    url: `/verse-shares/${id}`,
    method: "delete",
  });
};
